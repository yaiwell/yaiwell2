import { runCommissionSweep, type CommissionSweepSummary } from '@/lib/services/billing';
import { autoCompleteStaleBookings } from '@/lib/services/booking';
import {
  selectReviewInviteCandidates,
  sendReviewInvites,
  type ReviewInviteSummary,
} from '@/lib/services/notifications';

/**
 * Reservas que se cierran solas por tanda. Acotado a lo que da tiempo a
 * invitar a valorar en la misma ejecución: las que no entran siguen
 * `confirmed` y se cierran (e invitan) mañana, en vez de cerrarse sin aviso.
 */
export const AUTO_COMPLETE_PER_RUN = 40;

/**
 * Tandas máximas por ejecución. Solo se repite mientras las tandas salen
 * llenas de reservas antiguas (sin invitación): así la primera ejecución
 * vacía el atraso que ya había en producción sin quitar sitio a las
 * invitaciones de las recientes.
 */
export const MAX_AUTO_COMPLETE_PASSES = 5;

/** Tiempo máximo (desde el inicio del cron) para empezar otra tanda. */
export const AUTO_COMPLETE_BUDGET_MS = 10_000;

/** Presupuesto del barrido de comisiones (Stripe) desde el inicio del cron. */
export const COMMISSION_BUDGET_MS = 25_000;

/**
 * Último momento para empezar una invitación a valorar. Las invitaciones
 * esperan a que acaben los recordatorios (los dos van por Resend y
 * comparten su límite) y paran con margen antes de `maxDuration = 60`.
 */
export const REVIEW_INVITES_BUDGET_MS = 45_000;

/** Resumen del cierre diario para la respuesta del cron. */
export interface DailyClosingSummary {
  autoCompleted: number;
  /** Completadas sin invitación por antiguas (cita de hace más de 7 días). */
  autoCompletedWithoutInvite: number;
  autoCompleteFailed: number;
  commissions: CommissionSweepSummary | null;
  reviewInvites: ReviewInviteSummary | null;
}

interface AutoCompleteRound {
  completed: number;
  failed: number;
  invitable: string[];
  chargeIds: string[];
}

/**
 * Cierre diario de reservas y comisiones (§4.bis, decidido 2026-10-30):
 *
 *  1. Completa las reservas `confirmed` (online y en el local) con más de
 *     72 h desde el inicio; las del local encolan su comisión. Solo se
 *     invita a valorar a las de los últimos 7 días.
 *  2. En paralelo:
 *     - barrido de comisiones: pasa a Stripe las recién encoladas, reintenta
 *       las `pending` y emite las facturas mensuales sueltas (≤ 25 s);
 *     - invitaciones a valorar de las recién completadas, después de los
 *       recordatorios.
 *
 * Composición de tres dominios (booking, billing, notifications), por eso
 * vive junto a la ruta y no en un service. Nunca lanza: cada paso que
 * falla queda en el log y en el resumen (`null`), y se reintenta mañana.
 *
 * @param now — instante del cron.
 * @param startedAt — inicio de la ejecución (ms epoch), base de los presupuestos.
 * @param reminders — barrido de recordatorios en curso, para no solaparse con él.
 */
export async function runDailyClosing(
  now: Date,
  startedAt: number,
  reminders: Promise<unknown>,
): Promise<DailyClosingSummary> {
  const round = await autoCompleteInRounds(now, startedAt);

  const [commissions, invites] = await Promise.allSettled([
    runCommissionSweep({
      now,
      deadline: startedAt + COMMISSION_BUDGET_MS,
      freshChargeIds: round.chargeIds,
    }),
    reminders
      .catch(() => undefined)
      .then(() => sendReviewInvites(round.invitable, startedAt + REVIEW_INVITES_BUDGET_MS)),
  ]);
  if (commissions.status === 'rejected') {
    console.error('[cron/daily-closing] commission sweep failed:', commissions.reason);
  }
  if (invites.status === 'rejected') {
    console.error('[cron/daily-closing] review invites failed:', invites.reason);
  }
  return {
    autoCompleted: round.completed,
    autoCompletedWithoutInvite: round.completed - round.invitable.length,
    autoCompleteFailed: round.failed,
    commissions: commissions.status === 'fulfilled' ? commissions.value : null,
    reviewInvites: invites.status === 'fulfilled' ? invites.value : null,
  };
}

/**
 * Tandas del cierre automático. Para cuando una tanda no sale llena (no
 * queda atraso), cuando ya hay tantas invitaciones como caben en una
 * ejecución, o al agotar tandas o tiempo. Si falla, lo ya completado se
 * conserva y el barrido de comisiones atrasadas sigue igual.
 */
async function autoCompleteInRounds(now: Date, startedAt: number): Promise<AutoCompleteRound> {
  const round: AutoCompleteRound = { completed: 0, failed: 0, invitable: [], chargeIds: [] };
  try {
    for (let pass = 0; pass < MAX_AUTO_COMPLETE_PASSES; pass++) {
      const auto = await autoCompleteStaleBookings(now, AUTO_COMPLETE_PER_RUN);
      round.completed += auto.completedBookingIds.length;
      round.failed += auto.failedBookingIds.length;
      round.chargeIds.push(...auto.commissionChargeIds);
      round.invitable.push(...(await invitableOf(auto.completedBookingIds, now)));

      const batch = auto.completedBookingIds.length + auto.failedBookingIds.length;
      // Tanda incompleta (no queda atraso) o solo fallos (se repetirían).
      if (batch < AUTO_COMPLETE_PER_RUN || auto.completedBookingIds.length === 0) break;
      if (round.invitable.length >= AUTO_COMPLETE_PER_RUN) break;
      if (Date.now() >= startedAt + AUTO_COMPLETE_BUDGET_MS) break;
    }
  } catch (err) {
    console.error('[cron/daily-closing] auto-complete failed:', err);
  }
  return round;
}

/** Si falla la consulta, no se invita (mejor sin correo que con uno viejo). */
async function invitableOf(ids: string[], now: Date): Promise<string[]> {
  try {
    return await selectReviewInviteCandidates(ids, now);
  } catch (err) {
    console.error('[cron/daily-closing] could not select review invites:', err);
    return [];
  }
}
