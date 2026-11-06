import 'server-only';

import { prisma } from '@/lib/db/prisma';

import { BillingPlanNotSeededError, BillingProviderNotFoundError } from './billing.errors';
import { dueFounderNotice } from './billing.founder-seat.rules';
import { applyPlanLimits } from './billing.plan-limits';
import { billingRepository } from './billing.repository';
import { isLiveStatus } from './billing.sync.mapping';

/** Aviso que debe enviar quien llama (el dominio de notificaciones). */
export type FounderSeatNoticeKind = 'first' | 'last' | 'ended';

export interface FounderSeatSweepOptions {
  now: Date;
  /** Instante (ms epoch) a partir del cual no se empieza otra plaza. */
  deadline: number;
  /** @returns `true` si el correo ha salido; si no, se reintenta mañana. */
  notify: (notice: FounderSeatNoticeKind, providerId: string, endsAt: Date) => Promise<boolean>;
}

export interface FounderSeatSweepSummary {
  ended: number;
  notified: number;
  failed: number;
}

/**
 * Barrido diario del regalo: cierra las plazas vencidas y envía los avisos de
 * 60 y 15 días y de fin. Un aviso solo se marca si ha salido, y una plaza que
 * falla no para a las demás: todo se reintenta mañana. La clave de idempotencia
 * del correo evita el duplicado si algo corta entre el envío y la marca.
 */
export async function runFounderSeatSweep(
  options: FounderSeatSweepOptions,
): Promise<FounderSeatSweepSummary> {
  const { deadline } = options;
  const summary: FounderSeatSweepSummary = { ended: 0, notified: 0, failed: 0 };
  const seats = await prisma.founderSeat.findMany({
    where: { OR: [{ endedAt: null }, { notifiedEndedAt: null }] },
    orderBy: { endsAt: 'asc' },
  });

  for (const seat of seats) {
    if (Date.now() >= deadline) break;
    try {
      await processSeat(seat, options, summary);
    } catch (err) {
      summary.failed++;
      console.error('[billing/founder-seat] seat %s failed:', seat.id, err);
    }
  }
  return summary;
}

async function processSeat(
  seat: {
    id: string;
    providerId: string;
    endsAt: Date;
    endedAt: Date | null;
    notified60At: Date | null;
    notified15At: Date | null;
  },
  { now, notify }: FounderSeatSweepOptions,
  summary: FounderSeatSweepSummary,
): Promise<void> {
  let awaitingEndNotice = seat.endedAt !== null;
  if (seat.endedAt === null && seat.endsAt.getTime() <= now.getTime()) {
    // Si ya contrató un plan de pago no hay nada que avisar.
    awaitingEndNotice = await endFounderSeat(seat.id, seat.providerId, now);
    summary.ended++;
    if (!awaitingEndNotice) return;
  }

  const notice = awaitingEndNotice ? 'ended' : dueFounderNotice(seat, now);
  if (!notice) return;
  if (!(await notify(notice, seat.providerId, seat.endsAt))) {
    summary.failed++;
    return;
  }
  await prisma.founderSeat.update({
    where: { id: seat.id },
    data:
      notice === 'ended'
        ? { notifiedEndedAt: now }
        : notice === 'first'
          ? { notified60At: now }
          : // El último aviso cierra también el primero si nunca llegó a salir.
            { notified15At: now, notified60At: now },
  });
  summary.notified++;
}

/**
 * Cierra una plaza vencida. Pasa a Gratis salvo que ya tenga suscripción viva:
 * entonces queda en el plan que paga. Los servicios que sobren se ocultan, igual
 * que en un impago.
 *
 * @returns `true` si el negocio ha bajado a Gratis.
 */
async function endFounderSeat(seatId: string, providerId: string, now: Date): Promise<boolean> {
  return prisma.$transaction(async (tx) => {
    const currentPlanId = await billingRepository.lockProviderPlan(tx, providerId);
    if (currentPlanId === null) throw new BillingProviderNotFoundError();
    const billing = await tx.providerBilling.findUnique({
      where: { providerId },
      select: { subscriptionStatus: true, subscribedPlanId: true },
    });

    const paidPlanId =
      billing?.subscribedPlanId && isLiveStatus(billing.subscriptionStatus ?? 'canceled')
        ? billing.subscribedPlanId
        : null;
    const target = await tx.plan.findUnique({
      where: paidPlanId ? { id: paidPlanId } : { tier: 'free' },
      select: { id: true, maxServices: true },
    });
    if (!target) throw new BillingPlanNotSeededError('free');

    if (target.id !== currentPlanId) {
      await billingRepository.setProviderPlan(tx, providerId, target.id);
    }
    await applyPlanLimits(tx, providerId, target.maxServices, now);
    await tx.founderSeat.update({
      where: { id: seatId },
      data: paidPlanId ? { endedAt: now, notifiedEndedAt: now } : { endedAt: now },
    });
    return paidPlanId === null;
  });
}
