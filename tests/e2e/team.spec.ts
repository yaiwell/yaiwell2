import { expect, test, type Page } from '@playwright/test';
import type { Client } from 'pg';

import es from '../../src/messages/es.json';
import {
  addDaysToDateKey,
  getMadridDateKey,
  getMadridWeekStartKey,
  madridLocalToUtc,
} from '../../src/lib/utils/madrid-week';
import {
  MIN_MS,
  SERVICE_MINUTES,
  SERVICE_PRICE_CENTS,
  assertClerkDevKeys,
  connectDb,
  countRows,
  createTestUser,
  deleteTestUser,
  type TestUser,
} from './utils/onsite-seed';
import { signInAs } from './utils/sign-in';

/**
 * E2E del equipo (CLAUDE.md §4.bis «Equipo», decidido 2026-11-03).
 *
 * Negocio de plan Gratis (cupo de 3 profesionales) con 4 profesionales
 * activos que prestan el mismo servicio, con horarios distintos:
 *   A 09:00-13:00 · B 11:00-17:00 · C 15:00-19:00 · D 06:00-08:00
 * D es el 4.º por antigüedad: queda FUERA del cupo del plan.
 *
 *  a) Ficha y selector del flujo muestran A, B y C pero no D; «cualquiera»
 *     viene marcado.
 *  b) API: con A solo huecos de A; sin profesional, la unión (sin D); con D, 404.
 *  c) Coherencia UI <-> servidor: lo que pinta el selector de hora es lo que
 *     devuelve la API para cada profesional elegido.
 *  d) Reserva «cualquiera» pagando en el local con A ocupado a esa hora:
 *     se asigna a B y la confirmación dice quién atiende.
 *  e) Panel: /panel/equipo (estados, aviso de fuera de plan) y calendario
 *     filtrado por profesional.
 *  f) Baja: con cita futura queda bloqueada con la lista; sin citas, se da.
 *
 * Sin Stripe: pago en el local (sin PaymentIntent). La BD es la de
 * producción: todo va marcado con `MARK` y se borra por id en `afterAll`.
 */

const MARK = 'PRUEBA E2E equipo';
const TZ = 'Europe/Madrid';
const T = es.providerPanel.team;
const TB = es.booking;

test.use({ locale: 'es-ES', timezoneId: TZ, navigationTimeout: 120_000 });
test.setTimeout(240_000);
test.describe.configure({ mode: 'serial' });

/** Día fijo (Madrid) a 2 días vista: siempre respeta antelación y el pago en el local. */
const DAY = addDaysToDateKey(getMadridDateKey(new Date()), 2);
const at = (hhmm: string) => madridLocalToUtc(DAY, hhmm);

const ALL_WEEK = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
const scheduleOf = (open: string, close: string) =>
  JSON.stringify(Object.fromEntries(ALL_WEEK.map((d) => [d, [{ open, close }]])));

interface Pro {
  key: 'A' | 'B' | 'C' | 'D';
  name: string;
  open: string;
  close: string;
  id: string;
}
const pros: Pro[] = [
  { key: 'A', name: 'Aroa E2E', open: '09:00', close: '13:00', id: '' },
  { key: 'B', name: 'Berta E2E', open: '11:00', close: '17:00', id: '' },
  { key: 'C', name: 'Carla E2E', open: '15:00', close: '19:00', id: '' },
  { key: 'D', name: 'Dora E2E', open: '06:00', close: '08:00', id: '' },
];
const P = Object.fromEntries(pros.map((p) => [p.key, p])) as Record<Pro['key'], Pro>;

let db: Client;
let owner: TestUser | null = null;
let client: TestUser | null = null;
let filler: TestUser | null = null;
let providerId = '';
let serviceId = '';
let slugWithId = '';
let bookingAId = '';
let bookingBId = '';
let before: Record<string, number> = {};
let beforeExtra: Record<string, number> = {};

const dc = (page: Page, id: string) => page.locator(`[data-component="${id}"]`);
const hm = new Intl.DateTimeFormat('es-ES', {
  timeZone: TZ,
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});
const label = (d: Date) => hm.format(d);

/** Horas (HH:mm Madrid) de los huecos que cada profesional tiene libres según su horario y las citas sembradas. */
function grid(open: string, close: string, taken: string[] = []): string[] {
  const out: string[] = [];
  const end = at(close).getTime();
  for (
    let t = at(open).getTime();
    t + SERVICE_MINUTES * MIN_MS <= end;
    t += SERVICE_MINUTES * MIN_MS
  ) {
    const l = label(new Date(t));
    if (!taken.includes(l)) out.push(l);
  }
  return out;
}

async function extraCounts(): Promise<Record<string, number>> {
  const out: Record<string, number> = {};
  for (const t of ['service_professionals', 'schedule_blocks']) {
    out[t] = (await db.query(`SELECT count(*)::int AS n FROM ${t}`)).rows[0].n;
  }
  return out;
}

/** Respuesta de la API pública de huecos para el día fijo (horas Madrid, ordenadas). */
async function apiSlots(page: Page, professionalId?: string) {
  const qs = `date=${DAY}${professionalId ? `&professionalId=${professionalId}` : ''}`;
  const res = await page.request.get(`/api/availability/services/${serviceId}?${qs}`);
  return { status: res.status(), body: await res.json() };
}
const apiLabels = (body: { slots: { startAtIso: string }[] }) =>
  body.slots.map((s) => label(new Date(s.startAtIso))).sort();

async function insertPro(p: Pro, createdOffsetMin: number) {
  p.id = (
    await db.query(
      `INSERT INTO professionals (id, "providerId", name, schedule, "bufferMinutes", "createdAt", "updatedAt")
       VALUES (gen_random_uuid()::text, $1, $2, $3::jsonb, 0, $4, now()) RETURNING id`,
      [
        providerId,
        p.name,
        scheduleOf(p.open, p.close),
        new Date(Date.now() - createdOffsetMin * MIN_MS).toISOString(),
      ],
    )
  ).rows[0].id;
}

async function insertBooking(p: Pro, hhmm: string): Promise<string> {
  const start = at(hhmm);
  return (
    await db.query(
      `INSERT INTO bookings (id, "clientId", "serviceId", "professionalId", "providerId", "startAt", "endAt",
         status, "priceCents", "commissionCents", notes, "paymentMode", "updatedAt")
       VALUES (gen_random_uuid()::text, $1, $2, $3, $4, $5, $6, 'confirmed'::"BookingStatus", $7, 0, $8,
         'online'::"BookingPaymentMode", now())
       RETURNING id`,
      [
        filler!.id,
        serviceId,
        p.id,
        providerId,
        start.toISOString(),
        new Date(start.getTime() + SERVICE_MINUTES * MIN_MS).toISOString(),
        SERVICE_PRICE_CENTS,
        MARK,
      ],
    )
  ).rows[0].id;
}

test.beforeAll(async () => {
  test.setTimeout(240_000);
  assertClerkDevKeys();
  db = await connectDb();
  before = await countRows(db);
  beforeExtra = await extraCounts();

  owner = await createTestUser(db, { role: 'provider', clerk: true, label: 'team-owner' });
  client = await createTestUser(db, { role: 'client', clerk: true, label: 'team-client' });
  filler = await createTestUser(db, { role: 'client', clerk: false, label: 'team-filler' });

  const plan = (await db.query(`SELECT id, "maxProfessionals" FROM plans WHERE tier = 'free'`))
    .rows[0];
  if (plan.maxProfessionals !== 3) {
    throw new Error(
      `El plan Gratis ya no tiene cupo 3 (${plan.maxProfessionals}); revisar el spec.`,
    );
  }
  const category = (await db.query('SELECT id FROM categories LIMIT 1')).rows[0].id;
  const stamp = Date.now();
  const slug = `e2e-equipo-${stamp}-${Math.floor(Math.random() * 1e4)}`;

  providerId = (
    await db.query(
      `INSERT INTO providers (id, "userId", type, "businessName", slug, description, address, location,
         photos, "priceRange", "planId", "verificationStatus", "acceptsOnsitePayment", "updatedAt")
       VALUES (gen_random_uuid()::text, $1, 'centro', $2, $3, $4::jsonb, 'Calle E2E 1, Palma',
         ST_SetSRID(ST_MakePoint(2.65, 39.57), 4326)::geography, '{}', '€', $5,
         'approved'::"VerificationStatus", true, now())
       RETURNING id`,
      [owner.id, `${MARK} ${stamp}`, slug, JSON.stringify({ es: MARK }), plan.id],
    )
  ).rows[0].id;
  slugWithId = `${slug}-${providerId}`;
  // Método de pago guardado (cliente de Stripe FALSO): requisito del pago en el local.
  await db.query(
    `INSERT INTO provider_billing (id, "providerId", "stripeCustomerId", "onsitePaymentMethodReadyAt", "updatedAt")
     VALUES (gen_random_uuid()::text, $1, $2, now(), now())`,
    [providerId, `cus_e2e_fake_team_${stamp}`],
  );

  // El más antiguo primero: D (4.º) queda fuera del cupo de 3.
  for (const [i, p] of pros.entries()) await insertPro(p, 40 - i * 10);

  serviceId = (
    await db.query(
      `INSERT INTO services (id, "providerId", "professionalId", "categoryId", name, description,
         "durationMinutes", "priceCents", "isActive", "updatedAt")
       VALUES (gen_random_uuid()::text, $1, $2, $3, $4::jsonb, $5::jsonb, $6, $7, true, now())
       RETURNING id`,
      [
        providerId,
        P.A.id,
        category,
        JSON.stringify({ es: `Servicio ${MARK}` }),
        JSON.stringify({ es: MARK }),
        SERVICE_MINUTES,
        SERVICE_PRICE_CENTS,
      ],
    )
  ).rows[0].id;
  for (const p of pros) {
    await db.query(
      'INSERT INTO service_professionals ("serviceId", "professionalId") VALUES ($1, $2)',
      [serviceId, p.id],
    );
  }

  // A ocupada a las 11:00 y B a las 16:00 (citas de un cliente ficticio).
  bookingAId = await insertBooking(P.A, '11:00');
  bookingBId = await insertBooking(P.B, '16:00');
});

test.afterAll(async () => {
  const problems: string[] = [];
  const attempt = async (what: string, sql: string, params: unknown[]) => {
    try {
      await db.query(sql, params);
    } catch (e) {
      problems.push(`${what}: ${(e as Error).message}`);
    }
  };
  try {
    if (db && providerId) {
      // Solo ids creados aquí; orden por FKs.
      await attempt('bookings', 'DELETE FROM bookings WHERE "providerId" = $1', [providerId]);
      await attempt('slot_offers', 'DELETE FROM slot_offers WHERE "providerId" = $1', [providerId]);
      await attempt('schedule_blocks', 'DELETE FROM schedule_blocks WHERE "providerId" = $1', [
        providerId,
      ]);
      await attempt('services', 'DELETE FROM services WHERE id = $1', [serviceId]);
      await attempt('professionals', 'DELETE FROM professionals WHERE "providerId" = $1', [
        providerId,
      ]);
      await attempt('provider_billing', 'DELETE FROM provider_billing WHERE "providerId" = $1', [
        providerId,
      ]);
      await attempt('providers', 'DELETE FROM providers WHERE id = $1', [providerId]);
    }
    problems.push(...(await deleteTestUser(db, client)));
    problems.push(...(await deleteTestUser(db, filler)));
    problems.push(...(await deleteTestUser(db, owner)));
    if (db) {
      const after = await countRows(db);
      const afterExtra = await extraCounts();
      console.warn(
        '[team] filas antes/después:',
        JSON.stringify({
          before: { ...before, ...beforeExtra },
          after: { ...after, ...afterExtra },
        }),
      );
      const q = async (sql: string, p: unknown[]) => (await db.query(sql, p)).rows[0].n as number;
      const users = [owner?.id, client?.id, filler?.id].filter(Boolean);
      expect(
        {
          providers: await q('SELECT count(*)::int n FROM providers WHERE id = $1', [providerId]),
          professionals: await q(
            'SELECT count(*)::int n FROM professionals WHERE "providerId" = $1',
            [providerId],
          ),
          services: await q('SELECT count(*)::int n FROM services WHERE "providerId" = $1', [
            providerId,
          ]),
          links: await q(
            'SELECT count(*)::int n FROM service_professionals WHERE "serviceId" = $1',
            [serviceId],
          ),
          bookings:
            (await q('SELECT count(*)::int n FROM bookings WHERE "providerId" = $1', [
              providerId,
            ])) +
            (await q('SELECT count(*)::int n FROM bookings WHERE "clientId" = ANY($1::text[])', [
              users,
            ])),
          billing: await q('SELECT count(*)::int n FROM provider_billing WHERE "providerId" = $1', [
            providerId,
          ]),
          users: await q('SELECT count(*)::int n FROM users WHERE id = ANY($1::text[])', [users]),
        },
        'no debe quedar nada de lo sembrado',
      ).toEqual({
        providers: 0,
        professionals: 0,
        services: 0,
        links: 0,
        bookings: 0,
        billing: 0,
        users: 0,
      });
      // Balance global (solo es comparable si no corren otros specs a la vez).
      expect({ ...after, ...afterExtra }, 'recuentos globales antes/después').toEqual({
        ...before,
        ...beforeExtra,
      });
    }
  } finally {
    if (problems.length) console.warn('[team] limpieza con avisos:', problems);
    await db?.end().catch(() => undefined);
  }
});

/** Abre el selector de hora con una hora preseleccionada y espera a que cargue la agenda. */
async function openSlotStep(page: Page, hhmm: string) {
  const url = `/es/centro/${slugWithId}/reservar?serviceId=${serviceId}&slot=${encodeURIComponent(at(hhmm).toISOString())}`;
  const options = page.waitForResponse(
    (r) => r.request().method() === 'POST' && 'next-action' in r.request().headers(),
    { timeout: 60_000 },
  );
  await page.goto(url);
  await expect(dc(page, `booking-slot-picker-slot-${hhmm.replace(':', '')}`)).toHaveAttribute(
    'aria-pressed',
    'true',
    { timeout: 30_000 },
  );
  return options;
}

/** Horas que pinta el selector (excluye el aviso `...-slot-gone`). */
async function uiLabels(page: Page): Promise<string[]> {
  const ids = await page
    .locator('[data-component^="booking-slot-picker-slot-"]')
    .evaluateAll((els) => els.map((e) => e.getAttribute('data-component') ?? ''));
  return ids
    .map((id) => /-(\d{2})(\d{2})$/.exec(id))
    .filter((m): m is RegExpExecArray => !!m)
    .map((m) => `${m[1]}:${m[2]}`)
    .sort();
}

test('a) ficha y selector muestran A, B y C pero no el 4.º; «cualquiera» marcado', async ({
  page,
}) => {
  // Ficha pública (sin sesión).
  await page.goto(`/es/centro/${slugWithId}`);
  const team = dc(page, 'provider-team');
  await expect(team).toBeVisible();
  for (const key of ['A', 'B', 'C'] as const) {
    await expect(team.getByRole('heading', { name: P[key].name })).toBeVisible();
  }
  await expect(team.getByText(P.D.name)).toHaveCount(0);
  await expect(dc(page, 'provider-team-member')).toHaveCount(3);

  // Selector del flujo de reserva.
  await signInAs(page, client!.email);
  await openSlotStep(page, '12:00');
  const picker = dc(page, 'booking-professional-picker');
  await expect(picker).toBeVisible();
  await expect(picker.getByRole('radio')).toHaveCount(4); // cualquiera + A + B + C
  await expect(picker.getByRole('radio', { name: TB.summary.anyProfessional })).toBeChecked();
  for (const key of ['A', 'B', 'C'] as const) {
    await expect(picker.getByRole('radio', { name: P[key].name })).toBeVisible();
  }
  await expect(picker.getByText(P.D.name)).toHaveCount(0);
});

test('b) API: con A solo sus huecos; sin profesional la unión; con el 4.º, 404', async ({
  page,
}) => {
  const a = await apiSlots(page, P.A.id);
  expect(a.status).toBe(200);
  expect(apiLabels(a.body)).toEqual(grid('09:00', '13:00', ['11:00']));

  const b = await apiSlots(page, P.B.id);
  expect(b.status).toBe(200);
  expect(apiLabels(b.body)).toEqual(grid('11:00', '17:00', ['16:00']));

  // Unión de A, B y C (D con sus 06:00-07:30 NO entra por estar fuera de cupo).
  const any = await apiSlots(page);
  expect(any.status).toBe(200);
  const union = [
    ...new Set([
      ...grid('09:00', '13:00', ['11:00']),
      ...grid('11:00', '17:00', ['16:00']),
      ...grid('15:00', '19:00'),
    ]),
  ].sort();
  expect(apiLabels(any.body)).toEqual(union);
  expect(apiLabels(any.body)).not.toContain('06:00');

  const d = await apiSlots(page, P.D.id);
  expect(d.status).toBe(404);
});

test('c) coherencia UI <-> servidor: elegir profesional cambia las horas a las suyas', async ({
  page,
}) => {
  await signInAs(page, client!.email);
  await openSlotStep(page, '12:00');
  const picker = dc(page, 'booking-professional-picker');
  const slot12 = dc(page, 'booking-slot-picker-slot-1200');

  // «Cualquiera»: la unión del equipo.
  const any = await apiSlots(page);
  await expect.poll(() => uiLabels(page)).toEqual(apiLabels(any.body));

  // B: solo las de B; las de A (09:00) desaparecen y la hora elegida (12:00, de B) se conserva.
  await dc(page, `booking-professional-picker-${P.B.id}`).click();
  await expect(picker.getByRole('radio', { name: P.B.name })).toBeChecked();
  const b = await apiSlots(page, P.B.id);
  await expect.poll(() => uiLabels(page)).toEqual(apiLabels(b.body));
  expect(await uiLabels(page)).not.toContain('09:00');
  await expect(slot12).toHaveAttribute('aria-pressed', 'true');

  // A: sus horas; las de B/C desaparecen (15:00) y 11:00 (ocupada) no se ofrece.
  await dc(page, `booking-professional-picker-${P.A.id}`).click();
  await expect(picker.getByRole('radio', { name: P.A.name })).toBeChecked();
  const a = await apiSlots(page, P.A.id);
  await expect.poll(() => uiLabels(page)).toEqual(apiLabels(a.body));
  expect(await uiLabels(page)).not.toContain('15:00');
  expect(await uiLabels(page)).not.toContain('11:00');

  // Y todo hueco ofrecido por A es reservable: el servidor no lo rechaza como inexistente.
  expect(a.body.slots.length).toBeGreaterThan(0);
});

test('d) «cualquiera» pagando en el local con A ocupada: se asigna a B y se dice quién atiende', async ({
  page,
}) => {
  await signInAs(page, client!.email);
  const options = await openSlotStep(page, '11:00');
  await options;
  await expect(
    dc(page, 'booking-professional-picker').getByRole('radio', {
      name: TB.summary.anyProfessional,
    }),
  ).toBeChecked();
  await dc(page, 'booking-flow-next').click();
  await expect(dc(page, 'booking-summary')).toBeVisible();

  const onsite = dc(page, 'booking-payment-method-onsite').getByRole('radio');
  await expect(onsite).toBeEnabled();
  await onsite.check();
  await dc(page, 'booking-flow-next').click();
  await expect(dc(page, 'booking-onsite-confirm')).toBeVisible();
  await dc(page, 'booking-onsite-confirm-button').click();
  await expect(dc(page, 'booking-flow-confirmation')).toBeVisible({ timeout: 60_000 });

  const rows = (
    await db.query(
      `SELECT * FROM bookings WHERE "providerId" = $1 AND "clientId" = $2 AND "startAt" = $3
         AND status NOT IN ('cancelled','refunded')`,
      [providerId, client!.id, at('11:00').toISOString()],
    )
  ).rows;
  expect(rows).toHaveLength(1);
  expect(rows[0].professionalId).toBe(P.B.id);
  expect(rows[0].status).toBe('confirmed');
  expect(rows[0].paymentMode).toBe('onsite');

  const who = dc(page, 'booking-confirmation-professional');
  await expect(who).toContainText(TB.professionalPicker.assignedLabel);
  await expect(who).toContainText(P.B.name);
  await expect(who).not.toContainText(P.A.name);
});

test('e) panel: /panel/equipo con estados y aviso de fuera de plan; calendario filtrado', async ({
  page,
}) => {
  await signInAs(page, owner!.email);
  await page.goto('/es/panel/equipo');
  await expect(dc(page, 'team-list')).toBeVisible();
  const members = dc(page, 'team-member');
  await expect(members).toHaveCount(4);
  for (const key of ['A', 'B', 'C'] as const) {
    const row = members.filter({ hasText: P[key].name });
    await expect(row).toHaveAttribute('data-status', 'active');
  }
  const rowD = members.filter({ hasText: P.D.name });
  await expect(rowD).toHaveAttribute('data-status', 'outOfPlan');
  await expect(rowD).toContainText(T.status.outOfPlan);
  await expect(dc(page, 'team-plan-notice')).toContainText(T.outOfPlanNotice);
  // En el tope del plan no se ofrece «Añadir profesional».
  await expect(dc(page, 'team-add')).toHaveCount(0);

  // Calendario: filtro por profesional sobre la semana del día sembrado.
  const week = getMadridWeekStartKey(at('11:00'));
  await page.goto(`/es/panel/calendario?semana=${week}`);
  await expect(dc(page, 'calendar-professional-filter')).toBeVisible();
  const bookingA = page.locator(`[data-component^="weekly-calendar-booking-${bookingAId}"]`);
  const bookingB = page.locator(`[data-component^="weekly-calendar-booking-${bookingBId}"]`);
  await expect(dc(page, `weekly-calendar-booking-${bookingAId}`)).toBeVisible();
  await expect(dc(page, `weekly-calendar-booking-${bookingBId}`)).toBeVisible();

  await dc(page, `calendar-professional-filter-${P.B.id}`).click();
  await expect(page).toHaveURL(new RegExp(`pro=${P.B.id}`));
  await expect(dc(page, `weekly-calendar-booking-${bookingBId}`)).toBeVisible();
  await expect(bookingA).toHaveCount(0);

  await dc(page, `calendar-professional-filter-${P.A.id}`).click();
  await expect(page).toHaveURL(new RegExp(`pro=${P.A.id}`));
  await expect(dc(page, `weekly-calendar-booking-${bookingAId}`)).toBeVisible();
  await expect(bookingB).toHaveCount(0);

  // Un `pro` de otro negocio / inventado se ignora (no filtra a la nada ni rompe).
  await page.goto(`/es/panel/calendario?semana=${week}&pro=00000000-0000-4000-8000-000000000000`);
  await expect(dc(page, `weekly-calendar-booking-${bookingAId}`)).toBeVisible();
});

// Regresión (2026-11-03): la ficha del profesional entraba en bucle de
// render al teclear o abrir la baja (`PhotoUploader` notificaba en cada
// render con un `onChange` inline). f0 lo vigila.

/** Abre la ficha de un profesional y espera a la hidratación. */
async function openProfessional(page: Page, id: string) {
  await page.goto(`/es/panel/equipo/${id}`);
  await expect(dc(page, 'professional-form')).toBeVisible();
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1500);
}

test('f0) editar la ficha del profesional (teclear el nombre) no entra en bucle de render', async ({
  page,
}) => {
  const loops: string[] = [];
  page.on('console', (m) => {
    if (m.type() === 'error' && m.text().includes('Maximum update depth')) loops.push(m.text());
  });
  await signInAs(page, owner!.email);
  await openProfessional(page, P.A.id);
  // Cualquier re-render del formulario dispara el bucle; no se guarda nada.
  await dc(page, 'professional-input-name').fill(`${P.A.name} x`);
  await page.waitForTimeout(1500);
  expect(loops, 'bucle de render: Maximum update depth exceeded').toEqual([]);
  await expect(page.getByRole('heading', { name: es.error.panel.title })).toHaveCount(0);
  await expect(dc(page, 'professional-form')).toBeVisible();
});

test('f1) baja con cita futura: bloqueada, con la lista de citas', async ({ page }) => {
  await signInAs(page, owner!.email);

  // A tiene una cita futura: el diálogo la lista y no deja confirmar.
  await openProfessional(page, P.A.id);
  await dc(page, 'professional-deactivate').click();
  const dialog = dc(page, 'professional-deactivate-dialog');
  await expect(dialog).toBeVisible();
  const blocking = dc(page, 'professional-blocking-bookings');
  await expect(blocking).toContainText(T.deactivate.bookingsTitle);
  await expect(blocking.getByRole('listitem')).toHaveCount(1);
  await expect(blocking).toContainText(`Servicio ${MARK}`);
  await expect(dc(page, 'professional-deactivate-confirm')).toBeDisabled();
  await dialog.getByRole('button', { name: T.deactivate.cancel }).click();
  const a = (await db.query('SELECT "deletedAt" FROM professionals WHERE id = $1', [P.A.id]))
    .rows[0];
  expect(a.deletedAt).toBeNull();
});

test('f2) baja sin citas: se da de baja y el siguiente entra en el cupo', async ({ page }) => {
  await signInAs(page, owner!.email);

  // C no tiene citas: la baja se hace.
  await openProfessional(page, P.C.id);
  await dc(page, 'professional-deactivate').click();
  await expect(dc(page, 'professional-deactivate-dialog')).toBeVisible();
  await expect(dc(page, 'professional-blocking-bookings')).toHaveCount(0);
  await dc(page, 'professional-deactivate-confirm').click();
  await expect
    .poll(
      async () =>
        (await db.query('SELECT "deletedAt" FROM professionals WHERE id = $1', [P.C.id])).rows[0]
          .deletedAt,
      { timeout: 30_000 },
    )
    .not.toBeNull();

  // Consecuencia: C ya no sale y D (el siguiente más antiguo) entra en el cupo.
  const c = await apiSlots(page, P.C.id);
  expect(c.status).toBe(404);
  const d = await apiSlots(page, P.D.id);
  expect(d.status).toBe(200);
  expect(apiLabels(d.body)).toEqual(grid('06:00', '08:00'));

  await page.goto('/es/panel/equipo');
  await expect(dc(page, 'team-member').filter({ hasText: P.C.name })).toHaveAttribute(
    'data-status',
    'inactive',
  );
  await expect(dc(page, 'team-member').filter({ hasText: P.D.name })).toHaveAttribute(
    'data-status',
    'active',
  );
});
