import { expect, test, type Page } from '@playwright/test';
import type { Client } from 'pg';

import es from '../../src/messages/es.json';
import {
  DAY_MS,
  HOUR_MS,
  MIN_MS,
  SERVICE_PRICE_CENTS,
  assertClerkDevKeys,
  connectDb,
  countRows,
  createTestUser,
  deleteTestUser,
  leftovers,
  NOTHING_LEFT,
  insertBooking,
  insertSanction,
  seedVenue,
  teardownVenue,
  type SeededVenue,
  type TestUser,
} from './utils/onsite-seed';
import { signInAs } from './utils/sign-in';

/**
 * E2E del pago en el local (CLAUDE.md §4.bis, decidido 2026-10-29/30):
 * la opción que el selector de método de pago ofrece debe coincidir con lo
 * que acepta el servidor, y la reserva nace `confirmed` con `paymentMode =
 * 'onsite'` y sin PaymentIntent.
 *
 *  1. Negocio con opt-in + método de pago guardado, hueco a > 2 h -> reserva en el local.
 *  2. Hueco a < 2 h -> opción desactivada («última hora»).
 *  3. Negocio sin opt-in -> la opción ni aparece.
 *  4. Cliente con 3 sanciones en 12 meses -> desactivada, con la fecha de fin.
 *  5. Cliente con 3 reservas futuras en el local -> desactivada («tope»).
 *
 * Sin Stripe: el negocio lleva un `stripeCustomerId` falso y nunca se paga
 * online. Un único cliente de Clerk DEV; los estados se preparan en BD.
 */

const T = es.booking;
const TZ = 'Europe/Madrid';
const STEP_MS = 30 * MIN_MS;

test.use({ locale: 'es-ES', timezoneId: TZ, navigationTimeout: 120_000 });
test.setTimeout(180_000);
test.describe.configure({ mode: 'serial' });

let db: Client;
let owner: TestUser | null = null;
let client: TestUser | null = null;
let withOnsite: SeededVenue | null = null;
let withoutOnsite: SeededVenue | null = null;
let before: Record<string, number> = {};

const dc = (page: Page, id: string) => page.locator(`[data-component="${id}"]`);
const hm = new Intl.DateTimeFormat('es-ES', {
  timeZone: TZ,
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});
const SKIP_LABELS = ['23:30', '00:00', '00:30', '23:00'];

/** Primer hueco de la rejilla de 30 min a >= `minMs` desde ahora, lejos de la medianoche. */
function pickSlot(minMs: number): Date {
  let t = Math.ceil((Date.now() + minMs) / STEP_MS) * STEP_MS;
  while (SKIP_LABELS.includes(hm.format(new Date(t)))) t += STEP_MS;
  return new Date(t);
}

const reserveUrl = (v: SeededVenue, slot: Date) =>
  `/es/centro/${v.slugWithId}/reservar?serviceId=${v.serviceId}&slot=${encodeURIComponent(slot.toISOString())}`;

/**
 * Abre el selector con el hueco preseleccionado y pasa al resumen, esperando la
 * consulta de métodos de pago (server action que se lanza al elegir el hueco): así
 * «no aparece» nunca es un falso positivo por seguir cargando.
 */
async function reachSummary(page: Page, v: SeededVenue, slot: Date) {
  const options = page.waitForResponse(
    (r) => r.request().method() === 'POST' && 'next-action' in r.request().headers(),
    { timeout: 60_000 },
  );
  await page.goto(reserveUrl(v, slot));
  const slotButton = dc(page, `booking-slot-picker-slot-${hm.format(slot).replace(':', '')}`);
  await expect(slotButton).toHaveAttribute('aria-pressed', 'true', { timeout: 30_000 });
  await options;
  await dc(page, 'booking-flow-next').click();
  await expect(dc(page, 'booking-summary')).toBeVisible();
}

const onsiteRadio = (page: Page) => dc(page, 'booking-payment-method-onsite').getByRole('radio');
const onsiteHint = (page: Page) => dc(page, 'booking-payment-method-onsite-hint');

async function bookingsAt(v: SeededVenue, slot: Date) {
  return (
    await db.query(
      `SELECT * FROM bookings WHERE "providerId" = $1 AND "startAt" = $2 AND "clientId" = $3
         AND status NOT IN ('cancelled','refunded')`,
      [v.providerId, slot.toISOString(), client!.id],
    )
  ).rows;
}

test.beforeAll(async () => {
  test.setTimeout(240_000);
  assertClerkDevKeys();
  db = await connectDb();
  before = await countRows(db);

  owner = await createTestUser(db, { role: 'provider', clerk: false, label: 'onsite-owner' });
  client = await createTestUser(db, { role: 'client', clerk: true, label: 'onsite-client' });
  withOnsite = await seedVenue(db, owner.id, { onsite: true });
  withoutOnsite = await seedVenue(db, owner.id, { onsite: false });
});

test.afterAll(async () => {
  const problems: string[] = [];
  try {
    problems.push(...(await teardownVenue(db, withOnsite)));
    problems.push(...(await teardownVenue(db, withoutOnsite)));
    problems.push(...(await deleteTestUser(db, client)));
    problems.push(...(await deleteTestUser(db, owner)));
    if (db) {
      const after = await countRows(db);
      console.warn('[onsite-payment] filas antes/después:', JSON.stringify({ before, after }));
      // Con otros specs en paralelo el conteo global no es comparable: se exige que no
      // quede nada de lo sembrado aquí (el balance global se verifica con --workers=1).
      expect(
        await leftovers(db, {
          userIds: [owner?.id, client?.id],
          providerIds: [withOnsite?.providerId, withoutOnsite?.providerId],
        }),
        'no debe quedar nada de lo sembrado',
      ).toEqual(NOTHING_LEFT);
      void after;
    }
  } finally {
    if (problems.length) console.warn('[onsite-payment] limpieza con avisos:', problems);
    await db?.end().catch(() => undefined);
  }
});

test.beforeEach(async ({ page }) => {
  await signInAs(page, client!.email);
});

test('1. hueco a > 2 h: se reserva «Pagar en el local» y nace confirmed/onsite sin cobro', async ({
  page,
}) => {
  const slot = pickSlot(4 * HOUR_MS);
  await reachSummary(page, withOnsite!, slot);

  await expect(dc(page, 'booking-payment-method')).toBeVisible();
  await expect(onsiteRadio(page)).toBeEnabled();
  await expect(onsiteHint(page)).toHaveText(T.paymentMethod.onsite.hint);
  await onsiteRadio(page).check();

  // El botón del resumen pasa al paso de confirmación en el local, sin Stripe.
  await dc(page, 'booking-flow-next').click();
  await expect(dc(page, 'booking-onsite-confirm')).toBeVisible();
  // El precio se pinta sin decimales cuando son ceros («30 €»).
  await expect(dc(page, 'booking-onsite-amount')).toHaveText(
    /^30(,00)?\s*€$/, // = SERVICE_PRICE_CENTS / 100
  );
  await expect(dc(page, 'booking-onsite-no-show-notice')).toBeVisible();
  await expect(page.locator('[data-component="booking-stripe-payment"]')).toHaveCount(0);
  await dc(page, 'booking-onsite-confirm-button').click();

  await expect(dc(page, 'booking-flow-confirmation')).toBeVisible({ timeout: 60_000 });

  const rows = await bookingsAt(withOnsite!, slot);
  expect(rows).toHaveLength(1);
  expect(rows[0].status).toBe('confirmed');
  expect(rows[0].paymentMode).toBe('onsite');
  expect(rows[0].stripePaymentIntentId).toBeNull();
  expect(rows[0].priceCents).toBe(SERVICE_PRICE_CENTS);

  // Aparece en «Mis reservas» con la etiqueta de pago en el local.
  await page.goto('/es/mis-reservas');
  await expect(dc(page, `customer-booking-onsite-${rows[0].id}`)).toContainText(
    es.customerArea.paymentOnsite,
  );
});

test('2. hueco a < 2 h: la opción en el local sale desactivada por «última hora»', async ({
  page,
}) => {
  // Entre 70 y 100 min desde ahora: ofrecido por el selector (>= 30 min) pero de última hora.
  const slot = pickSlot(70 * MIN_MS);
  expect(slot.getTime() - Date.now()).toBeLessThan(2 * HOUR_MS);
  await reachSummary(page, withOnsite!, slot);

  await expect(onsiteRadio(page)).toBeDisabled();
  await expect(onsiteHint(page)).toHaveText(T.paymentMethod.onsite.lastMinute);
  expect(await bookingsAt(withOnsite!, slot)).toHaveLength(0);
});

test('3. negocio sin opt-in: la opción de pagar en el local no aparece', async ({ page }) => {
  await reachSummary(page, withoutOnsite!, pickSlot(4 * HOUR_MS));
  await expect(dc(page, 'booking-payment-method')).toHaveCount(0);
  await expect(dc(page, 'booking-payment-method-onsite')).toHaveCount(0);
});

test('4. cliente con 3 sanciones en 12 meses: desactivada, con la fecha de fin del bloqueo', async ({
  page,
}) => {
  const now = Date.now();
  const dates = [60, 40, 20].map((d) => new Date(now - d * DAY_MS));
  const sanctionedBookings: string[] = [];
  for (const occurredAt of dates) {
    const id = await insertBooking(db, withOnsite!, client!.id, {
      status: 'no_show',
      startAt: occurredAt,
      paymentMode: 'onsite',
      noShowAt: occurredAt,
    });
    await insertSanction(db, client!.id, id, occurredAt);
    sanctionedBookings.push(id);
  }

  // Bloqueo hasta la tercera + 3 meses naturales (UTC), en dd/mm de Madrid.
  const third = dates[2];
  const until = new Date(third.getTime());
  until.setUTCDate(1);
  until.setUTCMonth(third.getUTCMonth() + 3);
  const lastDay = new Date(
    Date.UTC(until.getUTCFullYear(), until.getUTCMonth() + 1, 0),
  ).getUTCDate();
  until.setUTCDate(Math.min(third.getUTCDate(), lastDay));
  until.setUTCHours(third.getUTCHours(), third.getUTCMinutes(), third.getUTCSeconds());
  // `Intl` en castellano da «10/1»; el aviso fija dos dígitos en día y mes («10/01»).
  const part = (type: 'day' | 'month') =>
    new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'numeric', timeZone: TZ })
      .formatToParts(until)
      .find((p) => p.type === type)!
      .value.padStart(2, '0');
  const untilLabel = `${part('day')}/${part('month')}`;

  await reachSummary(page, withOnsite!, pickSlot(8 * HOUR_MS));
  await expect(onsiteRadio(page)).toBeDisabled();
  await expect(onsiteHint(page)).toHaveText(
    T.paymentMethod.onsite.restrictedUntil.replace('{date}', untilLabel),
  );

  // Mis reservas avisa del bloqueo activo.
  await page.goto('/es/mis-reservas');
  await expect(dc(page, 'customer-onsite-restriction')).toBeVisible();

  // Limpieza del estado de este test (el resto de la limpieza va en afterAll).
  await db.query('DELETE FROM client_sanctions WHERE "bookingId" = ANY($1::text[])', [
    sanctionedBookings,
  ]);
  await db.query('DELETE FROM bookings WHERE id = ANY($1::text[])', [sanctionedBookings]);
});

test('5. cliente con 3 reservas futuras en el local: desactivada por «tope»', async ({ page }) => {
  // La del test 1 ya cuenta; se completan hasta 3 con reservas lejanas.
  const active = await db.query(
    `SELECT count(*)::int AS n FROM bookings
      WHERE "clientId" = $1 AND "paymentMode" = 'onsite' AND status = 'confirmed' AND "startAt" > now()`,
    [client!.id],
  );
  const missing = 3 - (active.rows[0].n as number);
  expect(missing, 'el test 1 debería haber dejado 1 reserva en el local').toBe(2);
  for (let i = 0; i < missing; i++) {
    await insertBooking(db, withOnsite!, client!.id, {
      status: 'confirmed',
      startAt: new Date(Date.now() + (3 + i) * DAY_MS),
      paymentMode: 'onsite',
    });
  }

  const slot = pickSlot(6 * HOUR_MS);
  await reachSummary(page, withOnsite!, slot);
  await expect(onsiteRadio(page)).toBeDisabled();
  await expect(onsiteHint(page)).toHaveText(
    T.paymentMethod.onsite.limitReached.replace('{max}', '3'),
  );
  expect(await bookingsAt(withOnsite!, slot)).toHaveLength(0);
});
