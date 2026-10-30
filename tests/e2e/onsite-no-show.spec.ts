import { expect, test, type Page } from '@playwright/test';
import type { Client } from 'pg';

import es from '../../src/messages/es.json';
import { getMadridWeekStartKey } from '../../src/lib/utils/madrid-week';
import {
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
 * E2E de «No se presentó» en el panel del profesional (CLAUDE.md §4.bis,
 * decidido 2026-10-29): lo que el panel ofrece debe coincidir con lo que
 * acepta el servidor.
 *
 *  1. Reserva en el local ya empezada: «No se presentó» -> `no_show` + fila
 *     vigente en `client_sanctions`; «Deshacer» -> `confirmed` y sanción revocada.
 *  2. Reserva online ya empezada: `no_show` sin sanción.
 *  3. Reserva futura: ni «No se presentó» ni «Marcar finalizada».
 *
 * El profesional es un usuario propio de Clerk DEV (dueño del negocio
 * sembrado); el cliente es solo una fila. Todo se borra por id al final.
 */

const NS = es.providerPanel.calendar.actions.noShow;
const UNDO = es.providerPanel.calendar.actions.undoNoShow;
const CAL = '/es/panel/calendario';

test.use({ locale: 'es-ES', timezoneId: 'Europe/Madrid', navigationTimeout: 120_000 });
test.setTimeout(180_000);
test.describe.configure({ mode: 'serial' });

let db: Client;
let provider: TestUser | null = null;
let client: TestUser | null = null;
let venue: SeededVenue | null = null;
let before: Record<string, number> = {};
const ids = { onsite: '', online: '', future: '' };
const starts = { onsite: new Date(), online: new Date(), future: new Date() };

const dc = (page: Page, id: string) => page.locator(`[data-component="${id}"]`);
const weekOf = (d: Date) => `${CAL}?semana=${getMadridWeekStartKey(d)}`;

test.beforeAll(async () => {
  test.setTimeout(240_000);
  assertClerkDevKeys();
  db = await connectDb();
  before = await countRows(db);

  provider = await createTestUser(db, { role: 'provider', clerk: true, label: 'noshow-provider' });
  client = await createTestUser(db, { role: 'client', clerk: false, label: 'noshow-client' });
  venue = await seedVenue(db, provider.id, { onsite: true });

  const now = Date.now();
  starts.onsite = new Date(now - 60 * MIN_MS);
  starts.online = new Date(now - 120 * MIN_MS);
  starts.future = new Date(now + 3 * HOUR_MS);
  ids.onsite = await insertBooking(db, venue, client.id, {
    status: 'confirmed',
    startAt: starts.onsite,
    paymentMode: 'onsite',
    createdAt: new Date(now - 2 * 24 * HOUR_MS),
  });
  ids.online = await insertBooking(db, venue, client.id, {
    status: 'confirmed',
    startAt: starts.online,
    createdAt: new Date(now - 2 * 24 * HOUR_MS),
  });
  ids.future = await insertBooking(db, venue, client.id, {
    status: 'confirmed',
    startAt: starts.future,
    paymentMode: 'onsite',
  });
});

test.afterAll(async () => {
  const problems: string[] = [];
  try {
    problems.push(...(await teardownVenue(db, venue)));
    problems.push(...(await deleteTestUser(db, client)));
    problems.push(...(await deleteTestUser(db, provider)));
    if (db) {
      const after = await countRows(db);
      console.log('[onsite-no-show] filas antes/después:', JSON.stringify({ before, after }));
      // Con otros specs en paralelo el conteo global no es comparable: se exige que no
      // quede nada de lo sembrado aquí (el balance global se verifica con --workers=1).
      expect(
        await leftovers(db, {
          userIds: [provider?.id, client?.id],
          providerIds: [venue?.providerId],
        }),
        'no debe quedar nada de lo sembrado',
      ).toEqual(NOTHING_LEFT);
      void after;
    }
  } finally {
    if (problems.length) console.warn('[onsite-no-show] limpieza con avisos:', problems);
    await db?.end().catch(() => undefined);
  }
});

test.beforeEach(async ({ page }) => {
  await signInAs(page, provider!.email);
});

const bookingRow = async (id: string) =>
  (await db.query('SELECT status, "noShowAt", "noShowMarkedBy" FROM bookings WHERE id = $1', [id]))
    .rows[0];
const sanctionRows = async (bookingId: string) =>
  (await db.query('SELECT * FROM client_sanctions WHERE "bookingId" = $1', [bookingId])).rows;

test('1. en el local: «No se presentó» crea la sanción y «Deshacer» la revoca', async ({
  page,
}) => {
  await page.goto(weekOf(starts.onsite));
  const item = dc(page, `booking-actions-item-${ids.onsite}`);
  await expect(item).toBeVisible();
  await expect(dc(page, `booking-actions-onsite-${ids.onsite}`)).toBeVisible();
  // Empezada y confirmada: se ofrecen las dos acciones de cierre.
  await expect(dc(page, `booking-actions-complete-${ids.onsite}`)).toBeVisible();

  await dc(page, `booking-actions-no-show-${ids.onsite}`).click();
  const dialog = dc(page, `booking-actions-no-show-dialog-${ids.onsite}`);
  await expect(dialog).toContainText(NS.descriptionOnsite);
  await dc(page, `booking-actions-no-show-confirm-${ids.onsite}`).click();

  await expect
    .poll(async () => (await bookingRow(ids.onsite)).status, { timeout: 30_000 })
    .toBe('no_show');
  const booked = await bookingRow(ids.onsite);
  expect(booked.noShowAt).not.toBeNull();
  expect(booked.noShowMarkedBy).toBe(provider!.id);
  const sanctions = await sanctionRows(ids.onsite);
  expect(sanctions).toHaveLength(1);
  expect(sanctions[0].userId).toBe(client!.id);
  expect(sanctions[0].reason).toBe('no_show');
  expect(sanctions[0].revokedAt).toBeNull();

  // La fila cambia de estado y ofrece «Deshacer» en lugar de las acciones de cierre.
  await expect(item).toHaveAttribute('data-status', 'no_show');
  await expect(item).toContainText(es.providerPanel.calendar.status.no_show);
  await expect(dc(page, `booking-actions-no-show-${ids.onsite}`)).toHaveCount(0);
  await expect(dc(page, `booking-actions-complete-${ids.onsite}`)).toHaveCount(0);

  await dc(page, `booking-actions-undo-no-show-${ids.onsite}`).click();
  await expect(dc(page, `booking-actions-undo-no-show-dialog-${ids.onsite}`)).toContainText(
    UNDO.confirmDescription,
  );
  await dc(page, `booking-actions-undo-no-show-confirm-${ids.onsite}`).click();

  await expect
    .poll(async () => (await bookingRow(ids.onsite)).status, { timeout: 30_000 })
    .toBe('confirmed');
  const restored = await bookingRow(ids.onsite);
  expect(restored.noShowAt).toBeNull();
  const revoked = await sanctionRows(ids.onsite);
  expect(revoked).toHaveLength(1);
  expect(revoked[0].revokedAt).not.toBeNull();
  await expect(item).toHaveAttribute('data-status', 'confirmed');
});

test('2. online: «No se presentó» deja no_show sin sanción', async ({ page }) => {
  await page.goto(weekOf(starts.online));
  await dc(page, `booking-actions-no-show-${ids.online}`).click();
  await expect(dc(page, `booking-actions-no-show-dialog-${ids.online}`)).toContainText(
    NS.descriptionOnline,
  );
  await dc(page, `booking-actions-no-show-confirm-${ids.online}`).click();

  await expect
    .poll(async () => (await bookingRow(ids.online)).status, { timeout: 30_000 })
    .toBe('no_show');
  expect(await sanctionRows(ids.online)).toHaveLength(0);
});

test('3. reserva futura: sin «No se presentó» ni «Marcar finalizada», pero sí cancelar', async ({
  page,
}) => {
  await page.goto(weekOf(starts.future));
  await expect(dc(page, `booking-actions-item-${ids.future}`)).toBeVisible();
  await expect(dc(page, `booking-actions-cancel-${ids.future}`).first()).toBeVisible();
  await expect(dc(page, `booking-actions-no-show-${ids.future}`)).toHaveCount(0);
  await expect(dc(page, `booking-actions-complete-${ids.future}`)).toHaveCount(0);
  expect((await bookingRow(ids.future)).status).toBe('confirmed');
});
