import path from 'node:path';

import { expect, test, type Page } from '@playwright/test';
import dotenv from 'dotenv';
import type { Client } from 'pg';

import es from '../../src/messages/es.json';
import {
  addDaysToDateKey,
  getMadridDateKey,
  getMadridWeekStartKey,
  madridLocalToUtc,
} from '../../src/lib/utils/madrid-week';
import {
  disconnectPrisma,
  ensureTestProviderInternalUser,
  ensureTestProviderRole,
} from './utils/clerk-test-user';
import { signInAs } from './utils/sign-in';
import { connectDb } from './utils/slot-offers-seed';

/**
 * E2E de los bloqueos puntuales de agenda (`/es/panel/calendario`):
 * crear desde el diálogo, verlos en la rejilla, que el motor de
 * disponibilidad los respete (API pública), que no pisen citas activas y
 * que quitarlos sea un borrado suave que libera las horas.
 *
 * Siembra un centro propio (provider + profesional 24 h + servicio de
 * 30 min) para el usuario provider de pruebas y una reserva sin
 * PaymentIntent; todo marcado con `MARK` y borrado por id en `afterAll`.
 * Las fechas se derivan de "mañana" y "pasado mañana" en Madrid con las
 * horas fijas (10-13 y 15-18), lejos de la antelación mínima.
 */

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const MARK = 'PRUEBA E2E bloqueos';
const T = es.providerPanel.calendar;
const TB = T.scheduleBlocks;
const CAL = '/es/panel/calendario';
const SERVICE_MINUTES = 30;
const REASON = 'PRUEBA E2E vacaciones';
const ALL_DAY = [{ open: '00:00', close: '23:59' }];
const OPEN_SCHEDULE = Object.fromEntries(
  ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map((d) => [
    d,
    ALL_DAY,
  ]),
);

test.use({ locale: 'es-ES', timezoneId: 'Europe/Madrid', navigationTimeout: 120_000 });
test.setTimeout(240_000);
test.describe.configure({ mode: 'serial' });

const now = new Date();
const DAY1 = addDaysToDateKey(getMadridDateKey(now), 1);
const DAY2 = addDaysToDateKey(getMadridDateKey(now), 2);
const BLOCK1_START = madridLocalToUtc(DAY1, '10:00');
const BLOCK1_END = madridLocalToUtc(DAY1, '13:00');
const BOOKING_START = madridLocalToUtc(DAY2, '16:00');

let db: Client;
let userId = '';
let providerId = '';
let professionalId = '';
let serviceId = '';
let bookingId = '';
let block1Id = '';
const before: Record<string, number> = {};
const TABLES = ['schedule_blocks', 'bookings', 'services', 'professionals', 'providers'];

const dc = (page: Page, id: string) => page.locator(`[data-component="${id}"]`);

async function counts(): Promise<Record<string, number>> {
  const out: Record<string, number> = {};
  for (const t of TABLES) {
    out[t] = (await db.query(`SELECT count(*)::int AS n FROM ${t}`)).rows[0].n;
  }
  return out;
}

/** Slots libres del servicio en un día (formato del route handler). */
async function fetchSlots(page: Page, dateKey: string) {
  const res = await page.request.get(`/api/availability/services/${serviceId}?date=${dateKey}`);
  expect(res.status()).toBe(200);
  const body = (await res.json()) as { slots: { startAtIso: string; endAtIso: string }[] };
  return body.slots.map((s) => ({ start: new Date(s.startAtIso), end: new Date(s.endAtIso) }));
}

const overlaps = (s: { start: Date; end: Date }, from: Date, to: Date) =>
  s.start < to && s.end > from;

async function openDialog(page: Page) {
  await page.goto(`${CAL}?semana=${getMadridWeekStartKey(BLOCK1_START)}`);
  const opener = dc(page, 'schedule-block-open');
  await expect(opener).toBeEnabled();
  await opener.click();
  await expect(dc(page, 'schedule-block-form')).toBeVisible();
}

async function fillRange(
  page: Page,
  dateKey: string,
  startTime: string,
  endTime: string,
  reason?: string,
) {
  await dc(page, 'schedule-block-start-date').fill(dateKey);
  await dc(page, 'schedule-block-start-time').fill(startTime);
  await dc(page, 'schedule-block-end-date').fill(dateKey);
  await dc(page, 'schedule-block-end-time').fill(endTime);
  if (reason) await dc(page, 'schedule-block-reason').fill(reason);
}

test.beforeAll(async () => {
  if (!process.env.CLERK_SECRET_KEY?.startsWith('sk_test_')) {
    throw new Error('CLERK_SECRET_KEY no es de test; abortamos.');
  }
  await ensureTestProviderRole();
  await ensureTestProviderInternalUser();

  db = await connectDb();
  Object.assign(before, await counts());

  const user = await db.query('SELECT id FROM users WHERE email = $1', [
    process.env.CLERK_TEST_PROVIDER_EMAIL,
  ]);
  userId = user.rows[0].id;
  const owned = await db.query('SELECT 1 FROM providers WHERE "userId" = $1', [userId]);
  if (owned.rowCount) {
    throw new Error('El usuario de pruebas ya tiene un centro: no lo tocamos, abortamos.');
  }
  const plan = (await db.query(`SELECT id FROM plans WHERE tier = 'pro'`)).rows[0].id;
  const category = (await db.query('SELECT id FROM categories LIMIT 1')).rows[0].id;
  const stamp = Date.now();

  providerId = (
    await db.query(
      `INSERT INTO providers (id, "userId", type, "businessName", slug, description, address, location,
         photos, "priceRange", "planId", "verificationStatus", "updatedAt")
       VALUES (gen_random_uuid()::text, $1, 'autonomo', $2, $3, $4::jsonb, 'Calle E2E 1, Palma',
         ST_SetSRID(ST_MakePoint(2.65, 39.57), 4326)::geography, '{}', '€', $5,
         'approved'::"VerificationStatus", now())
       RETURNING id`,
      [userId, `${MARK} ${stamp}`, `e2e-bloqueos-${stamp}`, JSON.stringify({ es: MARK }), plan],
    )
  ).rows[0].id;
  professionalId = (
    await db.query(
      `INSERT INTO professionals (id, "providerId", name, schedule, "bufferMinutes", "updatedAt")
       VALUES (gen_random_uuid()::text, $1, $2, $3::jsonb, 0, now()) RETURNING id`,
      [providerId, `Pro ${MARK}`, JSON.stringify(OPEN_SCHEDULE)],
    )
  ).rows[0].id;
  serviceId = (
    await db.query(
      `INSERT INTO services (id, "providerId", "professionalId", "categoryId", name, description,
         "durationMinutes", "priceCents", "isActive", "updatedAt")
       VALUES (gen_random_uuid()::text, $1, $2, $3, $4::jsonb, $5::jsonb, $6, 4999, true, now())
       RETURNING id`,
      [
        providerId,
        professionalId,
        category,
        JSON.stringify({ es: `Servicio ${MARK}` }),
        JSON.stringify({ es: MARK }),
        SERVICE_MINUTES,
      ],
    )
  ).rows[0].id;
  bookingId = (
    await db.query(
      `INSERT INTO bookings (id, "clientId", "serviceId", "professionalId", "providerId", "startAt", "endAt",
         status, "priceCents", "commissionCents", notes, "updatedAt")
       VALUES (gen_random_uuid()::text, $1, $2, $3, $4, $5, $6, 'confirmed'::"BookingStatus", 4999, 0, $7, now())
       RETURNING id`,
      [
        userId,
        serviceId,
        professionalId,
        providerId,
        BOOKING_START.toISOString(),
        new Date(BOOKING_START.getTime() + SERVICE_MINUTES * 60_000).toISOString(),
        MARK,
      ],
    )
  ).rows[0].id;
});

test.afterAll(async () => {
  try {
    if (db && providerId) {
      // Orden por FKs; solo ids creados aquí.
      await db.query('DELETE FROM schedule_blocks WHERE "providerId" = $1', [providerId]);
      await db.query('DELETE FROM slot_offers WHERE "providerId" = $1', [providerId]);
      await db.query('DELETE FROM bookings WHERE "providerId" = $1', [providerId]);
      await db.query('DELETE FROM services WHERE id = $1', [serviceId]);
      await db.query('DELETE FROM professionals WHERE id = $1', [professionalId]);
      await db.query('DELETE FROM providers WHERE id = $1', [providerId]);
      const after = await counts();
      expect(after).toEqual(before);
    }
  } finally {
    await db?.end().catch(() => undefined);
    await disconnectPrisma();
  }
});

test.beforeEach(async ({ page }) => {
  await signInAs(page, process.env.CLERK_TEST_PROVIDER_EMAIL!);
});

test('precondición: sin bloqueos hay huecos a las 10:00-13:00 de mañana', async ({ page }) => {
  const slots = await fetchSlots(page, DAY1);
  expect(slots.some((s) => overlaps(s, BLOCK1_START, BLOCK1_END))).toBe(true);
});

test('crear un bloqueo mañana 10:00-13:00: se ve en la rejilla y el motor lo respeta', async ({
  page,
}) => {
  await openDialog(page);
  await fillRange(page, DAY1, '10:00', '13:00', REASON);
  await dc(page, 'schedule-block-submit').click();
  await expect(dc(page, 'schedule-block-success')).toBeVisible();
  await page.getByRole('button', { name: TB.close }).click();

  const row = await db.query(
    'SELECT id, "startAt", "endAt", reason, "deletedAt" FROM schedule_blocks WHERE "providerId" = $1',
    [providerId],
  );
  expect(row.rowCount).toBe(1);
  block1Id = row.rows[0].id;
  expect(row.rows[0].startAt.toISOString()).toBe(BLOCK1_START.toISOString());
  expect(row.rows[0].endAt.toISOString()).toBe(BLOCK1_END.toISOString());
  expect(row.rows[0].reason).toBe(REASON);
  expect(row.rows[0].deletedAt).toBeNull();

  // Se ve en la rejilla del calendario con su rango y motivo.
  const ariaLabel = TB.block.ariaLabel.replace('{time}', '10:00–13:00');
  const block = page.getByRole('button', { name: ariaLabel });
  await expect(block).toBeVisible();
  await expect(block).toContainText(REASON);

  // Coherencia UI <-> servidor: ni un hueco solapa el rango, y fuera sí hay.
  const slots = await fetchSlots(page, DAY1);
  expect(slots.filter((s) => overlaps(s, BLOCK1_START, BLOCK1_END))).toHaveLength(0);
  expect(slots.some((s) => s.end <= BLOCK1_START)).toBe(true);
  expect(slots.some((s) => s.start >= BLOCK1_END)).toBe(true);
});

test('un bloqueo que pisa una cita confirmada se rechaza y lista la cita', async ({ page }) => {
  await openDialog(page);
  await fillRange(page, DAY2, '15:00', '18:00');
  await dc(page, 'schedule-block-submit').click();

  const error = dc(page, 'schedule-block-error');
  await expect(error).toBeVisible();
  await expect(error).toContainText(TB.errors.conflict);
  await expect(dc(page, `schedule-block-conflict-${bookingId}`)).toBeVisible();
  await expect(dc(page, `schedule-block-conflict-${bookingId}`)).toContainText('16:00');
  await expect(dc(page, 'schedule-block-success')).toHaveCount(0);

  const rows = await db.query(
    'SELECT count(*)::int AS n FROM schedule_blocks WHERE "providerId" = $1',
    [providerId],
  );
  expect(rows.rows[0].n).toBe(1); // solo el del paso anterior
});

test('quitar el bloqueo devuelve los huecos y deja borrado suave', async ({ page }) => {
  expect(block1Id).not.toBe('');
  await page.goto(`${CAL}?semana=${getMadridWeekStartKey(BLOCK1_START)}`);
  await page
    .getByRole('button', { name: TB.block.ariaLabel.replace('{time}', '10:00–13:00') })
    .click();
  await dc(page, `schedule-block-remove-${block1Id}`).click();
  await dc(page, `schedule-block-remove-confirm-${block1Id}`).click();
  await expect(dc(page, 'schedule-block-removed')).toBeVisible();

  const row = await db.query('SELECT "deletedAt", "deletedBy" FROM schedule_blocks WHERE id = $1', [
    block1Id,
  ]);
  expect(row.rowCount).toBe(1);
  expect(row.rows[0].deletedAt).not.toBeNull();
  expect(row.rows[0].deletedBy).toBe(userId);

  const slots = await fetchSlots(page, DAY1);
  expect(slots.some((s) => overlaps(s, BLOCK1_START, BLOCK1_END))).toBe(true);
  await page.keyboard.press('Escape');
  await page.reload();
  await expect(
    page.getByRole('button', { name: TB.block.ariaLabel.replace('{time}', '10:00–13:00') }),
  ).toHaveCount(0);
});
