import path from 'node:path';

import { clerk, setupClerkTestingToken } from '@clerk/testing/playwright';
import { expect, test, type Page } from '@playwright/test';
import dotenv from 'dotenv';
import { Client } from 'pg';

import es from '../../src/messages/es.json';
import { getMadridWeekStartKey } from '../../src/lib/utils/madrid-week';
import {
  disconnectPrisma,
  ensureTestProviderInternalUser,
  ensureTestProviderRole,
} from './utils/clerk-test-user';

/**
 * E2E del calendario interactivo del panel del proveedor
 * (`/es/panel/calendario`): semanas de lunes a lunes en hora de Madrid,
 * navegación por URL, bloques que abren el detalle con sus acciones y
 * vista móvil por pestañas.
 *
 * Usuario: el provider de pruebas ya existente (`CLERK_TEST_PROVIDER_*`);
 * no se crea nada en Clerk. Como ese usuario no tiene centro, el test
 * siembra uno propio (provider + profesional + servicio) marcado con
 * `PRUEBA E2E calendario` y lo borra por id en `afterAll`. El propio
 * usuario hace de cliente de las reservas (FK a `users`).
 *
 * Las cancelaciones se ejecutan SOLO sobre reservas sin PaymentIntent:
 * `cancelBookingByProviderWithRefund` devuelve `not_applicable` sin tocar
 * Stripe (ver checkout.refund.service.ts).
 */

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const MARK = 'PRUEBA E2E calendario';
const T = es.providerPanel.calendar;
const CAL = '/es/panel/calendario';

// Lunes fijo en invierno (CET, UTC+1): 00:30 Madrid = domingo 23:30 UTC.
const FIXED_MONDAY = '2027-02-01';
const MONDAY_BOOKING_START = new Date('2027-01-31T23:30:00.000Z');
// Miércoles 12:00 Madrid = 11:00 UTC.
const WEDNESDAY_BOOKING_START = new Date('2027-02-03T11:00:00.000Z');

test.use({ locale: 'es-ES', timezoneId: 'Europe/Madrid', navigationTimeout: 120_000 });
test.setTimeout(180_000);
test.describe.configure({ mode: 'serial' });

let db: Client;
let userId = '';
let providerId = '';
let professionalId = '';
let serviceId = '';
const ids: Record<'monday' | 'wednesday' | 'past' | 'future' | 'soon', string> = {
  monday: '',
  wednesday: '',
  past: '',
  future: '',
  soon: '',
};

const dc = (page: Page, id: string) => page.locator(`[data-component="${id}"]`);
const HOUR = 3_600_000;

/** Semana de Madrid (clave del lunes) en la que cae un instante. */
const weekOf = (d: Date) => getMadridWeekStartKey(d);

async function insertBooking(startAt: Date, status: string, priceCents: number) {
  const { rows } = await db.query(
    `INSERT INTO bookings (id, "clientId", "serviceId", "professionalId", "providerId", "startAt", "endAt",
       status, "priceCents", "commissionCents", notes, "updatedAt")
     VALUES (gen_random_uuid()::text, $1, $2, $3, $4, $5, $6, $7::"BookingStatus", $8, 0, $9, now())
     RETURNING id`,
    [
      userId,
      serviceId,
      professionalId,
      providerId,
      startAt,
      new Date(startAt.getTime() + HOUR),
      status,
      priceCents,
      MARK,
    ],
  );
  return rows[0].id as string;
}

test.beforeAll(async () => {
  if (!process.env.CLERK_SECRET_KEY?.startsWith('sk_test_')) {
    throw new Error('CLERK_SECRET_KEY no es de test; abortamos.');
  }
  await ensureTestProviderRole();
  await ensureTestProviderInternalUser();

  db = new Client({ connectionString: process.env.DIRECT_URL });
  await db.connect();

  const user = await db.query('SELECT id FROM users WHERE email = $1', [
    process.env.CLERK_TEST_PROVIDER_EMAIL,
  ]);
  userId = user.rows[0].id;
  const owned = await db.query('SELECT 1 FROM providers WHERE "userId" = $1', [userId]);
  if (owned.rowCount) {
    throw new Error('El usuario de pruebas ya tiene un centro: no lo tocamos, abortamos.');
  }
  const plan = (await db.query('SELECT id FROM plans ORDER BY "monthlyPriceCents" LIMIT 1')).rows[0]
    .id;
  const category = (await db.query('SELECT id FROM categories LIMIT 1')).rows[0].id;

  const stamp = Date.now();
  providerId = (
    await db.query(
      `INSERT INTO providers (id, "userId", type, "businessName", slug, description, address, location,
         photos, "priceRange", "planId", "updatedAt")
       VALUES (gen_random_uuid()::text, $1, 'autonomo', $2, $3, $4::jsonb, 'Calle E2E 1, Palma',
         ST_SetSRID(ST_MakePoint(2.65, 39.57), 4326)::geography, '{}', '€', $5, now())
       RETURNING id`,
      [userId, `${MARK} ${stamp}`, `e2e-calendario-${stamp}`, JSON.stringify({ es: MARK }), plan],
    )
  ).rows[0].id;
  professionalId = (
    await db.query(
      `INSERT INTO professionals (id, "providerId", name, schedule, "updatedAt")
       VALUES (gen_random_uuid()::text, $1, $2, '{}'::jsonb, now()) RETURNING id`,
      [providerId, `Pro ${MARK}`],
    )
  ).rows[0].id;
  serviceId = (
    await db.query(
      `INSERT INTO services (id, "providerId", "professionalId", "categoryId", name, description,
         "durationMinutes", "priceCents", "isActive", "updatedAt")
       VALUES (gen_random_uuid()::text, $1, $2, $3, $4::jsonb, $5::jsonb, 60, 5000, false, now())
       RETURNING id`,
      [
        providerId,
        professionalId,
        category,
        JSON.stringify({ es: `Servicio ${MARK}` }),
        JSON.stringify({ es: MARK }),
      ],
    )
  ).rows[0].id;

  const now = Date.now();
  ids.monday = await insertBooking(MONDAY_BOOKING_START, 'confirmed', 5000);
  ids.wednesday = await insertBooking(WEDNESDAY_BOOKING_START, 'confirmed', 5100);
  ids.past = await insertBooking(new Date(now - 3 * HOUR), 'confirmed', 5200);
  ids.future = await insertBooking(new Date(now + 6 * HOUR), 'confirmed', 5300);
  ids.soon = await insertBooking(new Date(now + 1 * HOUR), 'confirmed', 5400);
});

test.afterAll(async () => {
  try {
    if (db && providerId) {
      // Orden por FKs: reservas -> servicio -> profesional -> centro (solo ids creados aquí).
      await db.query('DELETE FROM bookings WHERE id = ANY($1::text[]) AND notes = $2', [
        Object.values(ids).filter(Boolean),
        MARK,
      ]);
      await db.query('DELETE FROM bookings WHERE "providerId" = $1 AND notes = $2', [
        providerId,
        MARK,
      ]);
      if (serviceId) await db.query('DELETE FROM services WHERE id = $1', [serviceId]);
      if (professionalId)
        await db.query('DELETE FROM professionals WHERE id = $1', [professionalId]);
      await db.query('DELETE FROM providers WHERE id = $1', [providerId]);
    }
  } finally {
    await db?.end().catch(() => undefined);
    await disconnectPrisma();
  }
});

test.beforeEach(async ({ page }) => {
  await setupClerkTestingToken({ page });
  // Hace falta una p�gina con el cliente JS de Clerk cargado. Entramos por
  // ticket (`emailAddress`, como el E2E de valorar): el login por contrase�a
  // no llega a crear la cookie `__session` en este entorno.
  await page.goto('/es/entrar', { waitUntil: 'domcontentloaded' });
  await clerk.signIn({ page, emailAddress: process.env.CLERK_TEST_PROVIDER_EMAIL! });
});

test('una reserva del lunes 00:30 de Madrid aparece en la columna del lunes de su semana', async ({
  page,
}) => {
  await page.goto(`${CAL}?semana=${FIXED_MONDAY}`);
  const monday = dc(page, 'weekly-calendar-day-mon');
  await expect(
    monday.locator(`[data-component="weekly-calendar-booking-${ids.monday}"]`),
  ).toBeVisible();
  await expect(
    dc(page, 'weekly-calendar-day-sun').locator(`[data-component^="weekly-calendar-booking-"]`),
  ).toHaveCount(0);
  await expect(dc(page, 'weekly-calendar-header-mon')).toContainText('1');

  // Cualquier día de la semana lleva al mismo lunes (miércoles -> lunes).
  await page.goto(`${CAL}?semana=2027-02-03`);
  await expect(dc(page, `weekly-calendar-booking-${ids.monday}`)).toBeVisible();

  // La semana anterior (domingo 31 en UTC) NO debe contenerla.
  await page.goto(`${CAL}?semana=2027-01-25`);
  await expect(dc(page, 'weekly-calendar-nav-label')).toBeVisible();
  await expect(dc(page, `weekly-calendar-booking-${ids.monday}`)).toHaveCount(0);
});

test('anterior, siguiente y Hoy cambian URL y etiqueta', async ({ page }) => {
  await page.goto(CAL);
  const label = dc(page, 'weekly-calendar-nav-label');
  const current = (await label.textContent())!;
  await expect(dc(page, 'weekly-calendar-nav-today')).toHaveCount(0);

  await page.getByRole('link', { name: T.nav.next }).click();
  await expect(page).toHaveURL(/semana=\d{4}-\d{2}-\d{2}/);
  const nextUrl = page.url();
  await expect(label).not.toHaveText(current);
  await expect(dc(page, 'weekly-calendar-nav-today')).toBeVisible();

  await page.getByRole('link', { name: T.nav.next }).click();
  await expect(page).not.toHaveURL(nextUrl);

  await page.getByRole('link', { name: T.nav.previous }).click();
  await expect(page).toHaveURL(nextUrl);

  await page.getByRole('link', { name: T.nav.today }).click();
  await expect(page).not.toHaveURL(/semana=/);
  await expect(label).toHaveText(current);
  // El día de hoy queda marcado en la cabecera.
  await expect(page.locator('[aria-current="date"]')).toHaveCount(1);
});

test('marcar finalizada una reserva confirmada ya pasada desde su bloque', async ({ page }) => {
  const week = weekOf(new Date(Date.now() - 3 * HOUR));
  await page.goto(`${CAL}?semana=${week}`);
  await dc(page, `weekly-calendar-booking-${ids.past}`).click();

  const detail = dc(page, `weekly-calendar-detail-${ids.past}`);
  await expect(detail).toBeVisible();
  await expect(dc(page, `weekly-calendar-detail-status-${ids.past}`)).toHaveText(
    T.status.confirmed,
  );

  await detail.getByRole('button', { name: T.actions.complete.button }).click();
  await dc(page, `booking-actions-complete-confirm-${ids.past}`).click();

  await expect(dc(page, `weekly-calendar-detail-status-${ids.past}`)).toHaveText(
    T.status.completed,
  );
  await expect(
    dc(page, `weekly-calendar-detail-${ids.past}`).getByRole('button', {
      name: T.actions.complete.button,
    }),
  ).toHaveCount(0);

  const { rows } = await db.query('SELECT status, "completedAt" FROM bookings WHERE id = $1', [
    ids.past,
  ]);
  expect(rows[0].status).toBe('completed');
  expect(rows[0].completedAt).not.toBeNull();
});

test('cancelar: habilitado a más de 2 h, deshabilitado a menos de 2 h (sin PaymentIntent)', async ({
  page,
}) => {
  // Sin PI: la cancelación no toca Stripe (not_applicable).
  const pi = await db.query(
    'SELECT count(*)::int AS n FROM bookings WHERE id = ANY($1::text[]) AND "stripePaymentIntentId" IS NOT NULL',
    [[ids.future, ids.soon]],
  );
  expect(pi.rows[0].n).toBe(0);

  // A < 2 h: botón deshabilitado y aviso visible.
  await page.goto(`${CAL}?semana=${weekOf(new Date(Date.now() + HOUR))}`);
  await dc(page, `weekly-calendar-booking-${ids.soon}`).click();
  const soonDetail = dc(page, `weekly-calendar-detail-${ids.soon}`);
  await expect(soonDetail.getByRole('button', { name: T.actions.cancel.button })).toBeDisabled();
  await expect(dc(page, `booking-actions-cancel-hint-${ids.soon}`).first()).toBeVisible();
  await page.keyboard.press('Escape');

  // A > 2 h: habilitado; se ejecuta y queda cancelada.
  await page.goto(`${CAL}?semana=${weekOf(new Date(Date.now() + 6 * HOUR))}`);
  await dc(page, `weekly-calendar-booking-${ids.future}`).click();
  const detail = dc(page, `weekly-calendar-detail-${ids.future}`);
  const cancelBtn = detail.getByRole('button', { name: T.actions.cancel.button });
  await expect(cancelBtn).toBeEnabled();
  await cancelBtn.click();
  await dc(page, `booking-actions-cancel-confirm-${ids.future}`).click();
  await expect(dc(page, `weekly-calendar-detail-status-${ids.future}`)).toHaveText(
    T.status.cancelled,
  );

  const { rows } = await db.query('SELECT status FROM bookings WHERE id = $1', [ids.future]);
  expect(rows[0].status).toBe('cancelled');
  // La de < 2 h sigue intacta.
  const soon = await db.query('SELECT status FROM bookings WHERE id = $1', [ids.soon]);
  expect(soon.rows[0].status).toBe('confirmed');
});

test.describe('vista móvil (375 px)', () => {
  test.use({ viewport: { width: 375, height: 800 } });

  test('cuadrícula oculta, pestañas visibles y cada pestaña muestra sus bloques', async ({
    page,
  }) => {
    await page.goto(`${CAL}?semana=${FIXED_MONDAY}`);

    await expect(dc(page, 'weekly-calendar-header-mon')).toBeHidden();
    const tabs = page.getByRole('tab');
    await expect(tabs).toHaveCount(7);
    await expect(dc(page, 'weekly-calendar-day-tab-mon')).toBeVisible();

    // El día inicial es el primero con reservas: el lunes.
    await expect(dc(page, 'weekly-calendar-day-tab-mon')).toHaveAttribute('aria-selected', 'true');
    await expect(dc(page, `weekly-calendar-booking-${ids.monday}-day`)).toBeVisible();
    await expect(dc(page, `weekly-calendar-booking-${ids.wednesday}-day`)).toHaveCount(0);

    await dc(page, 'weekly-calendar-day-tab-wed').click();
    await expect(dc(page, 'weekly-calendar-day-tab-wed')).toHaveAttribute('aria-selected', 'true');
    await expect(dc(page, `weekly-calendar-booking-${ids.wednesday}-day`)).toBeVisible();
    await expect(dc(page, `weekly-calendar-booking-${ids.monday}-day`)).toHaveCount(0);

    // Un día sin reservas muestra el mensaje de día vacío.
    await dc(page, 'weekly-calendar-day-tab-fri').click();
    await expect(dc(page, 'weekly-calendar-day-empty')).toHaveText(T.emptyDay);
  });
});
