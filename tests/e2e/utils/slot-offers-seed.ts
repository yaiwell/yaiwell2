import { Client, types } from 'pg';
import Stripe from 'stripe';

/**
 * Siembra y limpieza del centro de pruebas del E2E de huecos liberados
 * (`slot-offers.spec.ts`).
 *
 * Todo lo que se crea va marcado con `MARK` y se borra por id en
 * `teardownCenter`. El centro tiene horario las 24 h (rejilla de 30 min:
 * servicio de 30 min, buffer 0) para que haya huecos libres a cualquier
 * hora de ejecución, y una cuenta Connect de TEST propia (nunca la de
 * Studio Aura) para que el checkout pueda crear el PaymentIntent.
 */

export const MARK = 'PRUEBA E2E huecos';
export const SERVICE_PRICE_CENTS = 4999;
export const SERVICE_MINUTES = 30;
export const HOUR_MS = 3_600_000;

/** Horario abierto todo el día, todos los días (HH:mm en hora de Madrid). */
const ALL_DAY = [{ open: '00:00', close: '23:59' }];
const OPEN_SCHEDULE = {
  monday: ALL_DAY,
  tuesday: ALL_DAY,
  wednesday: ALL_DAY,
  thursday: ALL_DAY,
  friday: ALL_DAY,
  saturday: ALL_DAY,
  sunday: ALL_DAY,
};

export interface SeededCenter {
  userId: string;
  providerId: string;
  professionalId: string;
  serviceId: string;
  slug: string;
  slugWithId: string;
  stripeAccountId: string;
  commissionRateBps: number;
}

/**
 * Conexión directa a la BD con las fechas en UTC.
 *
 * Las columnas `timestamp(3)` de Prisma son SIN zona horaria y guardan UTC.
 * `pg` serializa un `Date` con la hora LOCAL del proceso y parsea esas
 * columnas también como local: el viaje de ida y vuelta parece correcto
 * pero la app (Prisma) ve la fecha desplazada 1-2 h. Por eso aquí las
 * lecturas se parsean como UTC y las escrituras deben pasar `toISOString()`
 * (Postgres ignora el sufijo `Z` en un `timestamp` sin zona).
 */
export async function connectDb(): Promise<Client> {
  const client = new Client({
    connectionString: process.env.DIRECT_URL,
    types: {
      getTypeParser: (oid: number, format?: 'text' | 'binary') =>
        oid === 1114
          ? (value: string) => new Date(`${value.replace(' ', 'T')}Z`)
          : types.getTypeParser(oid, format),
    } as typeof types,
  });
  await client.connect();
  return client;
}

export function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY ?? '';
  if (!key.startsWith('sk_test_')) {
    throw new Error('STRIPE_SECRET_KEY no es de test (sk_test_); abortamos.');
  }
  return new Stripe(key);
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Cuenta Custom de TEST con cargos habilitados (tarda ~10 s en activarse). */
async function createChargeableTestAccount(stripe: Stripe): Promise<string> {
  const account = await stripe.accounts.create({
    type: 'custom',
    country: 'ES',
    email: 'e2e-huecos@example.com',
    business_type: 'individual',
    capabilities: { card_payments: { requested: true }, transfers: { requested: true } },
    business_profile: { url: 'https://accessible.stripe.com', mcc: '7230' },
    individual: {
      first_name: 'Jenny',
      last_name: 'Rosen',
      dob: { day: 1, month: 1, year: 1901 },
      id_number: '000000000',
      email: 'e2e-huecos@example.com',
      phone: '+34600000000',
      address: { line1: 'address_full_match', city: 'Madrid', postal_code: '28001', country: 'ES' },
    },
    external_account: {
      object: 'bank_account',
      country: 'ES',
      currency: 'eur',
      account_number: 'ES0700120345030000067890',
    },
    tos_acceptance: { date: Math.floor(Date.now() / 1000), ip: '127.0.0.1' },
    metadata: { e2e: MARK },
  });
  for (let i = 0; i < 48; i++) {
    const current = await stripe.accounts.retrieve(account.id);
    if (current.charges_enabled) return account.id;
    await sleep(2500);
  }
  await stripe.accounts.del(account.id).catch(() => undefined);
  throw new Error('La cuenta Connect de test no habilitó cargos a tiempo.');
}

/** Siembra centro aprobado + profesional + servicio activo + cuenta Connect de test. */
export async function seedCenter(db: Client, userId: string): Promise<SeededCenter> {
  const owned = await db.query('SELECT 1 FROM providers WHERE "userId" = $1', [userId]);
  if (owned.rowCount) {
    throw new Error('El usuario de pruebas ya tiene un centro: no lo tocamos, abortamos.');
  }
  // Plan "pro" (8 %): comisión distinta de la del primer plan, para que el
  // cálculo salga del plan del centro y no de un valor por defecto.
  const plan = (await db.query(`SELECT id, "commissionRateBps" FROM plans WHERE tier = 'pro'`))
    .rows[0];
  const category = (await db.query('SELECT id FROM categories LIMIT 1')).rows[0].id;

  const stripeAccountId = await createChargeableTestAccount(getStripe());
  const stamp = Date.now();
  const slug = `e2e-huecos-${stamp}`;

  const providerId = (
    await db.query(
      `INSERT INTO providers (id, "userId", type, "businessName", slug, description, address, location,
         photos, "priceRange", "planId", "verificationStatus", "stripeAccountId", "updatedAt")
       VALUES (gen_random_uuid()::text, $1, 'autonomo', $2, $3, $4::jsonb, 'Calle E2E 1, Palma',
         ST_SetSRID(ST_MakePoint(2.65, 39.57), 4326)::geography, '{}', '€', $5,
         'approved'::"VerificationStatus", $6, now())
       RETURNING id`,
      [userId, `${MARK} ${stamp}`, slug, JSON.stringify({ es: MARK }), plan.id, stripeAccountId],
    )
  ).rows[0].id as string;

  const professionalId = (
    await db.query(
      `INSERT INTO professionals (id, "providerId", name, schedule, "bufferMinutes", "updatedAt")
       VALUES (gen_random_uuid()::text, $1, $2, $3::jsonb, 0, now()) RETURNING id`,
      [providerId, `Pro ${MARK}`, JSON.stringify(OPEN_SCHEDULE)],
    )
  ).rows[0].id as string;

  const serviceId = (
    await db.query(
      `INSERT INTO services (id, "providerId", "professionalId", "categoryId", name, description,
         "durationMinutes", "priceCents", "isActive", "updatedAt")
       VALUES (gen_random_uuid()::text, $1, $2, $3, $4::jsonb, $5::jsonb, $6, $7, true, now())
       RETURNING id`,
      [
        providerId,
        professionalId,
        category,
        JSON.stringify({ es: `Servicio ${MARK}` }),
        JSON.stringify({ es: MARK }),
        SERVICE_MINUTES,
        SERVICE_PRICE_CENTS,
      ],
    )
  ).rows[0].id as string;

  return {
    userId,
    providerId,
    professionalId,
    serviceId,
    slug,
    slugWithId: `${slug}-${providerId}`,
    stripeAccountId,
    commissionRateBps: plan.commissionRateBps,
  };
}

/** Reserva sintética sin PaymentIntent (la cancelación no toca Stripe). */
export async function insertSyntheticBooking(
  db: Client,
  c: SeededCenter,
  startAt: Date,
  status: string,
): Promise<string> {
  const { rows } = await db.query(
    `INSERT INTO bookings (id, "clientId", "serviceId", "professionalId", "providerId", "startAt", "endAt",
       status, "priceCents", "commissionCents", notes, "updatedAt")
     VALUES (gen_random_uuid()::text, $1, $2, $3, $4, $5, $6, $7::"BookingStatus", $8, 0, $9, now())
     RETURNING id`,
    [
      c.userId,
      c.serviceId,
      c.professionalId,
      c.providerId,
      startAt.toISOString(),
      new Date(startAt.getTime() + SERVICE_MINUTES * 60_000).toISOString(),
      status,
      SERVICE_PRICE_CENTS,
      MARK,
    ],
  );
  return rows[0].id as string;
}

/** Borra por id todo lo sembrado y cancela PaymentIntents y cuenta de test. */
export async function teardownCenter(db: Client, c: SeededCenter | null): Promise<string[]> {
  const problems: string[] = [];
  if (!c) return problems;
  const attempt = async (label: string, fn: () => Promise<unknown>) => {
    try {
      await fn();
    } catch (err) {
      problems.push(`${label}: ${(err as Error).message}`);
    }
  };

  const stripe = getStripe();
  const pis = await db
    .query(
      `SELECT "stripePaymentIntentId" AS id FROM bookings
       WHERE "providerId" = $1 AND "stripePaymentIntentId" IS NOT NULL`,
      [c.providerId],
    )
    .then((r) => r.rows.map((row) => row.id as string))
    .catch(() => [] as string[]);
  for (const id of pis) {
    await attempt(`cancelar PI ${id}`, () => stripe.paymentIntents.cancel(id));
  }
  // Margen para que los webhooks del cancel no se encuentren la reserva borrada.
  if (pis.length) await sleep(4000);

  await attempt('bookings', () =>
    db.query('DELETE FROM bookings WHERE "providerId" = $1 AND notes = $2', [c.providerId, MARK]),
  );
  await attempt('bookings restantes', () =>
    db.query('DELETE FROM bookings WHERE "providerId" = $1', [c.providerId]),
  );
  await attempt('slot_offers', () =>
    db.query('DELETE FROM slot_offers WHERE "providerId" = $1', [c.providerId]),
  );
  await attempt('services', () => db.query('DELETE FROM services WHERE id = $1', [c.serviceId]));
  await attempt('professionals', () =>
    db.query('DELETE FROM professionals WHERE id = $1', [c.professionalId]),
  );
  await attempt('providers', () => db.query('DELETE FROM providers WHERE id = $1', [c.providerId]));
  await attempt('cuenta Connect de test', () => stripe.accounts.del(c.stripeAccountId));
  return problems;
}
