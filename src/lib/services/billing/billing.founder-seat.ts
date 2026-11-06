import 'server-only';

import type { Prisma } from '@prisma/client';

import { prisma } from '@/lib/db/prisma';

import {
  FOUNDER_SEATS_TOTAL,
  founderSeatEnd,
  hasOpenHours,
  isFounderSeatLocked,
  isInMallorca,
  type FounderSeatBlockReason,
} from './billing.founder-seat.rules';
import { expireOpenPlanCheckouts } from './billing.checkout-sessions';
import { applyPlanLimits } from './billing.plan-limits';
import { LIVE_SUBSCRIPTION_STATUSES } from './billing.types';

type Db = Prisma.TransactionClient;

/** Qué pasaría (o pasó) con la plaza de un negocio; para la ficha de admin. */
export type FounderSeatPreview =
  | { kind: 'not_applicable' }
  | { kind: 'seated'; seatNumber: number; endsAt: Date }
  | { kind: 'will_grant'; seatNumber: number }
  | { kind: 'blocked'; reason: FounderSeatBlockReason };

/** Plaza sin cerrar del negocio, para el panel. */
export interface ActiveFounderSeat {
  endsAt: Date;
  /** `true` mientras no se puede contratar ningún plan. */
  locked: boolean;
}

/** Plazas disponibles para la landing de profesionales. */
export interface FounderPromoAvailability {
  total: number;
  remaining: number;
}

/**
 * Comprueba las condiciones del propio negocio (no el cupo).
 *
 * @returns `null` si cumple; `'outside'` si no está en Mallorca; el motivo si
 *   está en Mallorca pero le falta algo.
 */
async function checkEligibility(
  db: Db,
  providerId: string,
): Promise<'outside' | FounderSeatBlockReason | null> {
  // Los ids son `text` en BD: se comparan sin `::uuid`.
  const rows = await db.$queryRaw<Array<{ lat: number; lng: number }>>`
    SELECT ST_Y(location::geometry)::float8 AS lat, ST_X(location::geometry)::float8 AS lng
    FROM providers
    WHERE id = ${providerId} AND "deletedAt" IS NULL
  `;
  const point = rows[0];
  if (!point || !isInMallorca(point.lat, point.lng)) return 'outside';

  const billing = await db.providerBilling.findUnique({
    where: { providerId },
    select: { subscriptionStatus: true },
  });
  const status = billing?.subscriptionStatus;
  if (status && (LIVE_SUBSCRIPTION_STATUSES as readonly string[]).includes(status)) {
    return 'paid_subscription';
  }

  const service = await db.service.findFirst({
    where: { providerId, isActive: true, deletedAt: null },
    select: { id: true },
  });
  if (!service) return 'no_service';

  const professionals = await db.professional.findMany({
    where: { providerId, deletedAt: null },
    select: { schedule: true },
  });
  return professionals.some((pro) => hasOpenHours(pro.schedule)) ? null : 'no_schedule';
}

/**
 * Da la plaza al aprobar un negocio de Mallorca, si cumple y queda cupo. La
 * elegibilidad se congela aquí: quien no entra al aprobarse ya no entra.
 *
 * Debe ejecutarse en la transacción de la aprobación, que ya ha bloqueado la
 * fila del negocio: una sincronización de Stripe concurrente espera a que acabe.
 * El advisory lock serializa las aprobaciones simultáneas para que el número de
 * plaza no se repita ni se pase del cupo.
 *
 * @param tx — transacción de la aprobación.
 * @param providerId — negocio aprobado.
 * @param now — instante de la aprobación, inicio del regalo.
 */
export async function grantFounderSeat(tx: Db, providerId: string, now: Date): Promise<void> {
  const provider = await tx.provider.findUnique({
    where: { id: providerId },
    select: { founderEvaluatedAt: true },
  });
  if (!provider || provider.founderEvaluatedAt) return;
  await tx.provider.update({ where: { id: providerId }, data: { founderEvaluatedAt: now } });
  if ((await checkEligibility(tx, providerId)) !== null) return;

  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('founder_seats'))`;
  const used = await tx.founderSeat.count();
  if (used >= FOUNDER_SEATS_TOTAL) return;

  const premium = await tx.plan.findUnique({
    where: { tier: 'premium' },
    select: { id: true, maxServices: true },
  });
  // Sin catálogo no se bloquea la aprobación: el negocio sigue en su plan.
  if (!premium) {
    console.error('[billing/founder-seat] premium plan is not seeded');
    return;
  }

  await tx.founderSeat.create({
    data: { providerId, seatNumber: used + 1, startsAt: now, endsAt: founderSeatEnd(now) },
  });
  await tx.provider.update({ where: { id: providerId }, data: { planId: premium.id } });
  await applyPlanLimits(tx, providerId, premium.maxServices, now);
}

/**
 * ¿La plaza del negocio impide contratar un plan? Deja de hacerlo 24 h antes del
 * final, para que pueda seguir en un plan de pago sin perder servicios.
 */
export async function hasActiveFounderSeat(db: Db, providerId: string, now: Date) {
  const seat = await db.founderSeat.findFirst({
    where: { providerId, endedAt: null },
    select: { endsAt: true },
  });
  return seat !== null && isFounderSeatLocked(seat.endsAt, now);
}

/** Plaza sin cerrar del negocio, o `null` si no tiene. */
export async function getActiveFounderSeat(providerId: string): Promise<ActiveFounderSeat | null> {
  const seat = await prisma.founderSeat.findFirst({
    where: { providerId, endedAt: null },
    select: { endsAt: true },
  });
  if (!seat) return null;
  return { endsAt: seat.endsAt, locked: isFounderSeatLocked(seat.endsAt, new Date()) };
}

/**
 * Caduca los Checkout de plan abiertos antes de aprobar, para que nadie pague un
 * plan que ya tiene de regalo. **Nunca lanza**: va tras responder, y si un pago se
 * cuela, la sincronización lo reembolsa.
 */
export async function expireCheckoutsAfterFounderSeat(providerId: string): Promise<void> {
  try {
    const row = await prisma.founderSeat.findUnique({
      where: { providerId },
      select: { provider: { select: { billing: { select: { stripeCustomerId: true } } } } },
    });
    const customerId = row?.provider.billing?.stripeCustomerId;
    if (customerId) await expireOpenPlanCheckouts(customerId);
  } catch (err) {
    console.error('[billing/founder-seat] could not expire checkouts:', err);
  }
}

/** Plazas libres para el contador público. */
export async function getFounderPromoAvailability(): Promise<FounderPromoAvailability> {
  const used = await prisma.founderSeat.count();
  return {
    total: FOUNDER_SEATS_TOTAL,
    remaining: Math.max(0, FOUNDER_SEATS_TOTAL - used),
  };
}

/** Lo que verá el admin antes de aprobar. Sin bloqueos: es solo orientativo. */
export async function getFounderSeatPreview(providerId: string): Promise<FounderSeatPreview> {
  const seat = await prisma.founderSeat.findUnique({
    where: { providerId },
    select: { seatNumber: true, endsAt: true },
  });
  if (seat) return { kind: 'seated', seatNumber: seat.seatNumber, endsAt: seat.endsAt };

  const provider = await prisma.provider.findUnique({
    where: { id: providerId },
    select: { founderEvaluatedAt: true },
  });
  if (provider?.founderEvaluatedAt) return { kind: 'not_applicable' };

  const check = await checkEligibility(prisma, providerId);
  if (check === 'outside') return { kind: 'not_applicable' };
  if (check) return { kind: 'blocked', reason: check };

  const used = await prisma.founderSeat.count();
  return used >= FOUNDER_SEATS_TOTAL
    ? { kind: 'blocked', reason: 'seats_exhausted' }
    : { kind: 'will_grant', seatNumber: used + 1 };
}
