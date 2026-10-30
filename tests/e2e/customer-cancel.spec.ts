import { expect, test, type Page } from '@playwright/test';
import type { Client } from 'pg';

import es from '../../src/messages/es.json';
import {
  DAY_MS,
  HOUR_MS,
  MIN_MS,
  assertClerkDevKeys,
  connectDb,
  countRows,
  createTestUser,
  deleteTestUser,
  leftovers,
  NOTHING_LEFT,
  insertBooking,
  seedVenue,
  teardownVenue,
  type SeededVenue,
  type TestUser,
} from './utils/onsite-seed';
import { signInAs } from './utils/sign-in';

/**
 * E2E de la cancelación por el cliente (CLAUDE.md §4.bis, decidido
 * 2026-10-29): lo que `/mis-reservas` ofrece (botón o aviso) debe coincidir
 * con lo que acepta el servidor.
 *
 *  - Reserva online `confirmed` a > 2 h: botón -> diálogo -> confirmar ->
 *    `cancelled` y pasa al historial.
 *  - A < 2 h (reservada con antelación): sin botón y con el aviso de «ya no se puede».
 *  - De última hora (reservada a < 2 h del inicio): sin botón y con el aviso propio.
 *  - En el local a > 2 h: se cancela «sin cargo».
 *
 * Todo sin Stripe: las reservas se siembran sin PaymentIntent. La BD es la
 * de producción; se borra todo por id en `afterAll`.
 */

const T = es.customerArea;

test.use({ locale: 'es-ES', timezoneId: 'Europe/Madrid', navigationTimeout: 120_000 });
test.setTimeout(180_000);
test.describe.configure({ mode: 'serial' });

let db: Client;
let owner: TestUser | null = null;
let client: TestUser | null = null;
let venue: SeededVenue | null = null;
let before: Record<string, number> = {};
const ids = { online: '', tooLate: '', lastMinute: '', onsite: '' };

const dc = (page: Page, id: string) => page.locator(`[data-component="${id}"]`);

test.beforeAll(async () => {
  test.setTimeout(240_000);
  assertClerkDevKeys();
  db = await connectDb();
  before = await countRows(db);

  owner = await createTestUser(db, { role: 'provider', clerk: false, label: 'cancel-owner' });
  client = await createTestUser(db, { role: 'client', clerk: true, label: 'cancel-client' });
  venue = await seedVenue(db, owner.id, { onsite: false });

  const now = Date.now();
  // Franjas separadas entre sí (el profesional no admite solapes).
  ids.online = await insertBooking(db, venue, client.id, {
    status: 'confirmed',
    startAt: new Date(now + 5 * HOUR_MS),
  });
  // Reservada ayer para dentro de 70 min: no es de última hora, pero ya no se cancela.
  ids.tooLate = await insertBooking(db, venue, client.id, {
    status: 'confirmed',
    startAt: new Date(now + 70 * MIN_MS),
    createdAt: new Date(now - DAY_MS),
  });
  // Reservada hace 5 min para dentro de 110 min (115 min de antelación < 2 h): última hora.
  ids.lastMinute = await insertBooking(db, venue, client.id, {
    status: 'confirmed',
    startAt: new Date(now + 110 * MIN_MS),
    createdAt: new Date(now - 5 * MIN_MS),
  });
  ids.onsite = await insertBooking(db, venue, client.id, {
    status: 'confirmed',
    startAt: new Date(now + 8 * HOUR_MS),
    paymentMode: 'onsite',
  });
});

test.afterAll(async () => {
  const problems: string[] = [];
  try {
    problems.push(...(await teardownVenue(db, venue)));
    problems.push(...(await deleteTestUser(db, client)));
    problems.push(...(await deleteTestUser(db, owner)));
    if (db) {
      const after = await countRows(db);
      console.log('[customer-cancel] filas antes/después:', JSON.stringify({ before, after }));
      // Con otros specs en paralelo el conteo global no es comparable: se exige que no
      // quede nada de lo sembrado aquí (el balance global se verifica con --workers=1).
      expect(
        await leftovers(db, { userIds: [owner?.id, client?.id], providerIds: [venue?.providerId] }),
        'no debe quedar nada de lo sembrado',
      ).toEqual(NOTHING_LEFT);
      void after;
    }
  } finally {
    if (problems.length) console.warn('[customer-cancel] limpieza con avisos:', problems);
    await db?.end().catch(() => undefined);
  }
});

test.beforeEach(async ({ page }) => {
  await signInAs(page, client!.email);
});

async function status(id: string): Promise<string> {
  return (await db.query('SELECT status FROM bookings WHERE id = $1', [id])).rows[0].status;
}

test('1. reserva online a > 2 h: botón, diálogo y cancelación; pasa al historial', async ({
  page,
}) => {
  await page.goto('/es/mis-reservas');
  const upcoming = dc(page, 'customer-bookings-section-upcoming');
  await expect(dc(page, `customer-booking-card-${ids.online}`)).toBeVisible();
  await expect(
    upcoming.locator(`[data-component="customer-booking-card-${ids.online}"]`),
  ).toHaveCount(1);

  const cancel = dc(page, `customer-booking-cancel-${ids.online}`);
  await expect(cancel).toHaveText(T.actions.cancel);
  await cancel.click();

  const dialog = dc(page, `customer-booking-cancel-dialog-${ids.online}`);
  await expect(dialog.getByRole('heading', { name: T.cancelDialog.title })).toBeVisible();
  await dc(page, `customer-booking-cancel-confirm-${ids.online}`).click();

  // El servidor acepta el botón que la UI ofrecía: la reserva queda cancelada.
  await expect.poll(() => status(ids.online), { timeout: 30_000 }).toBe('cancelled');
  const row = (await db.query('SELECT "cancelledAt" FROM bookings WHERE id = $1', [ids.online]))
    .rows[0];
  expect(row.cancelledAt).not.toBeNull();

  // Tras recargar sale en el historial, ya sin acciones de cancelar.
  await page.goto('/es/mis-reservas');
  const past = dc(page, 'customer-bookings-section-past');
  const card = past.locator(`[data-component="customer-booking-card-${ids.online}"]`);
  await expect(card).toBeVisible();
  await expect(card).toContainText(T.status.cancelled);
  await expect(dc(page, `customer-booking-cancel-${ids.online}`)).toHaveCount(0);
});

test('2. a < 2 h (reservada con antelación): sin botón y con el aviso de «ya no se puede»', async ({
  page,
}) => {
  await page.goto('/es/mis-reservas');
  const card = dc(page, `customer-booking-card-${ids.tooLate}`);
  await expect(card).toBeVisible();
  await expect(dc(page, `customer-booking-cancel-${ids.tooLate}`)).toHaveCount(0);
  await expect(dc(page, `customer-booking-cancel-hint-${ids.tooLate}`)).toHaveText(
    T.actions.tooLateHint,
  );
  expect(await status(ids.tooLate)).toBe('confirmed');
});

test('3. reserva de última hora pagada: sin botón y con el aviso propio', async ({ page }) => {
  await page.goto('/es/mis-reservas');
  await expect(dc(page, `customer-booking-card-${ids.lastMinute}`)).toBeVisible();
  await expect(dc(page, `customer-booking-cancel-${ids.lastMinute}`)).toHaveCount(0);
  await expect(dc(page, `customer-booking-cancel-hint-${ids.lastMinute}`)).toHaveText(
    T.actions.lastMinuteHint,
  );
  expect(await status(ids.lastMinute)).toBe('confirmed');
});

test('4. reserva en el local a > 2 h: se cancela «sin cargo»', async ({ page }) => {
  await page.goto('/es/mis-reservas');
  await expect(dc(page, `customer-booking-onsite-${ids.onsite}`)).toContainText(T.paymentOnsite);

  await dc(page, `customer-booking-cancel-${ids.onsite}`).click();
  const dialog = dc(page, `customer-booking-cancel-dialog-${ids.onsite}`);
  // Sin cobro online no hay devolución: el diálogo lo dice antes de confirmar.
  await expect(dialog).toContainText(T.cancelDialog.noPaymentInfo);
  await dc(page, `customer-booking-cancel-confirm-${ids.onsite}`).click();

  // El resultado se anuncia en el aviso de página (el diálogo se cierra al revalidar).
  await expect(dc(page, 'customer-review-success')).toContainText(T.cancelDialog.result.no_payment);
  await expect.poll(() => status(ids.onsite), { timeout: 30_000 }).toBe('cancelled');
  const { rows } = await db.query(
    'SELECT "stripePaymentIntentId", "stripeRefundId" FROM bookings WHERE id = $1',
    [ids.onsite],
  );
  expect(rows[0].stripePaymentIntentId).toBeNull();
  expect(rows[0].stripeRefundId).toBeNull();
});
