import path from 'node:path';

import { createClerkClient } from '@clerk/backend';
import dotenv from 'dotenv';
import type { Client } from 'pg';

import { connectDb } from './slot-offers-seed';

/**
 * Siembra y limpieza compartidas por los E2E del cliente y del pago en el
 * local (cancelación del cliente, pago en el local, no presentados,
 * conversión a profesional).
 *
 * La BD es la de producción: todo lo que se crea va marcado con `MARK` /
 * emails `e2e-…@example.com`, se identifica por id y se borra en `afterAll`.
 * No usa Stripe: los negocios sembrados llevan un `stripeCustomerId` falso
 * que ningún flujo probado llega a tocar (reserva en el local = sin cobro).
 */

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

export { connectDb };

export const MARK = 'PRUEBA E2E local';
export const SERVICE_PRICE_CENTS = 3000;
export const SERVICE_MINUTES = 30;
export const MIN_MS = 60_000;
export const HOUR_MS = 3_600_000;
export const DAY_MS = 86_400_000;

const ALL_DAY = [{ open: '00:00', close: '23:59' }];
const OPEN_SCHEDULE = Object.fromEntries(
  ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map((d) => [
    d,
    ALL_DAY,
  ]),
);

/** Tablas que tocan estos specs: se cuentan antes y después. */
export const TOUCHED_TABLES = [
  'users',
  'providers',
  'professionals',
  'services',
  'provider_billing',
  'bookings',
  'client_sanctions',
  'onsite_commission_charges',
  'slot_offers',
  'reviews',
] as const;

/** Aborta si las claves de Clerk de `.env.local` no son de desarrollo. */
export function assertClerkDevKeys(): void {
  const sk = process.env.CLERK_SECRET_KEY ?? '';
  const pk = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ?? '';
  if (!sk.startsWith('sk_test_') || !pk.startsWith('pk_test_')) {
    throw new Error('Las claves de Clerk no son de desarrollo (pk_test_/sk_test_); abortamos.');
  }
}

/** Número de filas de cada tabla tocada (conteo exacto, no estimado). */
export async function countRows(db: Client): Promise<Record<string, number>> {
  const out: Record<string, number> = {};
  for (const table of TOUCHED_TABLES) {
    const { rows } = await db.query(`SELECT count(*)::int AS n FROM ${table}`);
    out[table] = rows[0].n as number;
  }
  return out;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** La red a api.clerk.com falla a ratos desde Node: reintentos con espera creciente. */
export async function withRetries<T>(fn: () => Promise<T>, attempts = 5): Promise<T> {
  for (let i = 1; ; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i >= attempts) throw error;
      await sleep(3000 * i);
    }
  }
}

export interface TestUser {
  id: string;
  clerkId: string;
  email: string;
  /** Solo si se creó en Clerk (puede iniciar sesión). */
  inClerk: boolean;
}

/**
 * Crea un usuario de prueba y su espejo en `users`. Con `clerk: true` también
 * existe en la instancia de DESARROLLO de Clerk (email `+clerk_test`), así
 * que puede iniciar sesión con `clerk.signIn`; si no, es solo una fila (para
 * ser dueño de un negocio que no inicia sesión).
 */
export async function createTestUser(
  db: Client,
  opts: { role: 'client' | 'provider'; clerk: boolean; label: string },
): Promise<TestUser> {
  const stamp = `${Date.now()}-${Math.floor(Math.random() * 1e5)}`;
  let clerkId = `e2e_fake_${stamp}`;
  let email = `e2e-${opts.label}-${stamp}@example.com`;
  if (opts.clerk) {
    assertClerkDevKeys();
    email = `e2e-${opts.label}-${stamp}+clerk_test@example.com`;
    const api = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });
    const created = await withRetries(() =>
      api.users.createUser({
        emailAddress: [email],
        skipPasswordRequirement: true,
        publicMetadata: { role: opts.role },
      }),
    );
    clerkId = created.id;
  }
  const { rows } = await db.query(
    `INSERT INTO users (id, "clerkId", email, role, locale, "fullName", "updatedAt")
     VALUES (gen_random_uuid()::text, $1, $2, $3::"UserRole", 'es', $4, now())
     ON CONFLICT ("clerkId") DO UPDATE SET "updatedAt" = now()
     RETURNING id`,
    [clerkId, email, opts.role, MARK],
  );
  return { id: rows[0].id as string, clerkId, email, inClerk: opts.clerk };
}

export interface SeededVenue {
  providerId: string;
  professionalId: string;
  serviceId: string;
  slug: string;
  slugWithId: string;
  ownerId: string;
}

/**
 * Negocio aprobado, abierto las 24 h (rejilla de 30 min), con un profesional
 * y un servicio de 30 min. `onsite` activa el opt-in y el método de pago
 * guardado (fila `provider_billing` con cliente de Stripe FALSO).
 */
export async function seedVenue(
  db: Client,
  ownerId: string,
  opts: { onsite: boolean },
): Promise<SeededVenue> {
  const plan = (await db.query(`SELECT id FROM plans WHERE tier = 'pro'`)).rows[0];
  const category = (await db.query('SELECT id FROM categories LIMIT 1')).rows[0].id;
  const stamp = Date.now();
  const slug = `e2e-local-${stamp}-${Math.floor(Math.random() * 1e4)}`;

  const providerId = (
    await db.query(
      `INSERT INTO providers (id, "userId", type, "businessName", slug, description, address, location,
         photos, "priceRange", "planId", "verificationStatus", "acceptsOnsitePayment", "updatedAt")
       VALUES (gen_random_uuid()::text, $1, 'autonomo', $2, $3, $4::jsonb, 'Calle E2E 1, Palma',
         ST_SetSRID(ST_MakePoint(2.65, 39.57), 4326)::geography, '{}', '€', $5,
         'approved'::"VerificationStatus", $6, now())
       RETURNING id`,
      [ownerId, `${MARK} ${stamp}`, slug, JSON.stringify({ es: MARK }), plan.id, opts.onsite],
    )
  ).rows[0].id as string;

  if (opts.onsite) {
    await db.query(
      `INSERT INTO provider_billing (id, "providerId", "stripeCustomerId", "onsitePaymentMethodReadyAt", "updatedAt")
       VALUES (gen_random_uuid()::text, $1, $2, now(), now())`,
      [providerId, `cus_e2e_fake_${stamp}_${providerId.slice(0, 8)}`],
    );
  }

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
    providerId,
    professionalId,
    serviceId,
    slug,
    slugWithId: `${slug}-${providerId}`,
    ownerId,
  };
}

export interface BookingSeed {
  status: 'confirmed' | 'pending' | 'no_show' | 'completed';
  startAt: Date;
  paymentMode?: 'online' | 'onsite';
  /** Cuándo se hizo la reserva (decide si fue de última hora). Por defecto, ahora. */
  createdAt?: Date;
  noShowAt?: Date;
}

/** Reserva sintética sin PaymentIntent (nada de lo probado llama a Stripe). */
export async function insertBooking(
  db: Client,
  v: SeededVenue,
  clientId: string,
  b: BookingSeed,
): Promise<string> {
  const { rows } = await db.query(
    `INSERT INTO bookings (id, "clientId", "serviceId", "professionalId", "providerId", "startAt", "endAt",
       status, "priceCents", "commissionCents", notes, "paymentMode", "createdAt", "noShowAt", "updatedAt")
     VALUES (gen_random_uuid()::text, $1, $2, $3, $4, $5, $6, $7::"BookingStatus", $8, 0, $9,
       $10::"BookingPaymentMode", $11, $12, now())
     RETURNING id`,
    [
      clientId,
      v.serviceId,
      v.professionalId,
      v.providerId,
      b.startAt.toISOString(),
      new Date(b.startAt.getTime() + SERVICE_MINUTES * MIN_MS).toISOString(),
      b.status,
      SERVICE_PRICE_CENTS,
      MARK,
      b.paymentMode ?? 'online',
      (b.createdAt ?? new Date()).toISOString(),
      b.noShowAt ? b.noShowAt.toISOString() : null,
    ],
  );
  return rows[0].id as string;
}

/** Sanción `no_show` vigente sobre una reserva ya sembrada (createdAt = occurredAt). */
export async function insertSanction(
  db: Client,
  userId: string,
  bookingId: string,
  occurredAt: Date,
): Promise<void> {
  await db.query(
    `INSERT INTO client_sanctions (id, "userId", "bookingId", reason, "occurredAt", "createdAt", "updatedAt")
     VALUES (gen_random_uuid()::text, $1, $2, 'no_show', $3, $3, now())`,
    [userId, bookingId, occurredAt.toISOString()],
  );
}

/** Borra por id todo lo sembrado de un negocio (reservas, sanciones, comisiones...). */
export async function teardownVenue(db: Client, v: SeededVenue | null): Promise<string[]> {
  const problems: string[] = [];
  if (!v) return problems;
  const attempt = async (label: string, sql: string, params: unknown[]) => {
    try {
      await db.query(sql, params);
    } catch (err) {
      problems.push(`${label}: ${(err as Error).message}`);
    }
  };
  const ids = `(SELECT id FROM bookings WHERE "providerId" = $1)`;
  await attempt(
    'onsite_commission_charges',
    `DELETE FROM onsite_commission_charges WHERE "bookingId" IN ${ids}`,
    [v.providerId],
  );
  await attempt('client_sanctions', `DELETE FROM client_sanctions WHERE "bookingId" IN ${ids}`, [
    v.providerId,
  ]);
  await attempt('reviews', `DELETE FROM reviews WHERE "bookingId" IN ${ids}`, [v.providerId]);
  await attempt('bookings', 'DELETE FROM bookings WHERE "providerId" = $1', [v.providerId]);
  await attempt('slot_offers', 'DELETE FROM slot_offers WHERE "providerId" = $1', [v.providerId]);
  await attempt('services', 'DELETE FROM services WHERE id = $1', [v.serviceId]);
  await attempt('professionals', 'DELETE FROM professionals WHERE id = $1', [v.professionalId]);
  await attempt('provider_billing', 'DELETE FROM provider_billing WHERE "providerId" = $1', [
    v.providerId,
  ]);
  await attempt('providers', 'DELETE FROM providers WHERE id = $1', [v.providerId]);
  return problems;
}

/** Borra la fila `users` (por clerkId, por si algún webhook la rehizo) y el usuario de Clerk. */
export async function deleteTestUser(
  db: Client | undefined,
  u: TestUser | null,
): Promise<string[]> {
  const problems: string[] = [];
  if (!u) return problems;
  if (db) {
    await db
      .query('DELETE FROM client_sanctions WHERE "userId" = $1', [u.id])
      .catch((e: Error) => problems.push(`sanctions de usuario: ${e.message}`));
    await db
      .query('DELETE FROM users WHERE "clerkId" = $1 OR id = $2', [u.clerkId, u.id])
      .catch((e: Error) => problems.push(`users: ${e.message}`));
  }
  if (u.inClerk) {
    const api = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });
    await withRetries(() => api.users.deleteUser(u.clerkId)).catch((e: Error) =>
      problems.push(`Clerk deleteUser ${u.clerkId}: ${e.message}`),
    );
  }
  return problems;
}

/**
 * Filas que siguen existiendo de lo sembrado por UN spec (por id). Es la
 * comprobación de limpieza que no se rompe si otros specs corren a la vez
 * (el conteo global de `countRows` solo es fiable con `--workers=1`).
 */
export async function leftovers(
  db: Client,
  ids: { userIds: Array<string | undefined>; providerIds: Array<string | undefined> },
): Promise<Record<string, number>> {
  const users = ids.userIds.filter((x): x is string => !!x);
  const providers = ids.providerIds.filter((x): x is string => !!x);
  const q = async (sql: string, list: string[]) =>
    (await db.query(sql, [list])).rows[0].n as number;
  return {
    users: await q('SELECT count(*)::int n FROM users WHERE id = ANY($1::text[])', users),
    providers: await q(
      'SELECT count(*)::int n FROM providers WHERE id = ANY($1::text[])',
      providers,
    ),
    professionals: await q(
      'SELECT count(*)::int n FROM professionals WHERE "providerId" = ANY($1::text[])',
      providers,
    ),
    services: await q(
      'SELECT count(*)::int n FROM services WHERE "providerId" = ANY($1::text[])',
      providers,
    ),
    provider_billing: await q(
      'SELECT count(*)::int n FROM provider_billing WHERE "providerId" = ANY($1::text[])',
      providers,
    ),
    bookings:
      (await q(
        'SELECT count(*)::int n FROM bookings WHERE "providerId" = ANY($1::text[])',
        providers,
      )) +
      (await q('SELECT count(*)::int n FROM bookings WHERE "clientId" = ANY($1::text[])', users)),
    client_sanctions: await q(
      'SELECT count(*)::int n FROM client_sanctions WHERE "userId" = ANY($1::text[])',
      users,
    ),
  };
}

/** Todo a cero: lo que `leftovers` debe devolver tras la limpieza. */
export const NOTHING_LEFT = {
  users: 0,
  providers: 0,
  professionals: 0,
  services: 0,
  provider_billing: 0,
  bookings: 0,
  client_sanctions: 0,
};
