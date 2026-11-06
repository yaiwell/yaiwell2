/**
 * Avisos por email de la facturación de planes. Como el resto de avisos,
 * **nunca lanzan**: se programan tras responder al webhook de Stripe y un
 * correo perdido no puede convertirse en un reintento del evento.
 */
import 'server-only';

import type { FounderSeatNoticeKind } from '@/lib/services/billing';
import type { PlanTierId } from '@/lib/services/plans';

import {
  buildFounderSeatEmail,
  buildPlanDowngradedEmail,
  buildPlanPaymentFailedEmail,
} from './notifications.billing-templates';
import { deliverEmail } from './notifications.delivery';
import { withProvider } from './notifications.service';

/**
 * Cobro de la cuota fallido (o pendiente de autenticación).
 *
 * @param key — `${invoiceId}:${intento}`: la clave de idempotencia va por
 *   intento, así que cada reintento fallido de Stripe avisa una vez.
 */
export async function notifyPlanPaymentFailed(providerId: string, key: string): Promise<void> {
  await withProvider('plan-payment-failed', providerId, (ctx) =>
    deliverEmail('plan-payment-failed', key, ctx.owner, buildPlanPaymentFailedEmail(ctx)),
  );
}

/**
 * El negocio ha bajado a Gratis. La ruta solo lo llama en la transición
 * real (`planChanged`), así que una reentrega del webhook no repite.
 *
 * @param fromPlan — plan de pago que tenía.
 */
export async function notifyPlanDowngraded(
  providerId: string,
  fromPlan: PlanTierId,
): Promise<void> {
  // La clave incluye el día: una segunda bajada otro día (tras volver a
  // contratar) sí debe llegar; dos procesos del mismo cambio, no.
  const day = new Date().toISOString().slice(0, 10);
  await withProvider('plan-downgraded', providerId, (ctx) =>
    deliverEmail(
      'plan-downgraded',
      `${providerId}:${fromPlan}:${day}`,
      ctx.owner,
      buildPlanDowngradedEmail(ctx, fromPlan),
    ),
  );
}

/**
 * Avisos del año de regalo: a 60 y 15 días del final y al terminar. La clave
 * lleva la fecha de fin porque cada plaza da un solo aviso de cada tipo.
 *
 * @returns `true` si el correo ha salido; el barrido reintenta los demás.
 */
export async function notifyFounderSeat(
  notice: FounderSeatNoticeKind,
  providerId: string,
  endsAt: Date,
): Promise<boolean> {
  const kind = `founder-seat-${notice}`;
  const refId = `${providerId}:${endsAt.toISOString().slice(0, 10)}`;
  const outcome = { delivered: false };
  await withProvider(kind, providerId, async (ctx) => {
    const content = buildFounderSeatEmail(ctx, notice, endsAt);
    outcome.delivered = await deliverEmail(kind, refId, ctx.owner, content);
  });
  return outcome.delivered;
}
