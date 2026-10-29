import 'server-only';

import { reportCheckoutWarning, retrievePaymentIntentWithCharge } from './checkout.payment-intent';
import type { CheckoutBookingRow } from './checkout.repository';
import type { BookingTransitionResult } from './checkout.types';
import { confirmBookingPayment } from './checkout.webhook.service';

/**
 * Pagos cobrados cuyo `payment_intent.succeeded` nunca se procesó.
 *
 * Si Stripe deja de reintentar el webhook (endpoint caído varios días,
 * secreto rotado, 500 persistentes) la reserva se queda en `pending` con
 * el dinero cobrado. Antes el cron la marcaba `skipped` cada día, para
 * siempre. Ahora el cron, pasado un margen, **asienta el pago con la
 * misma lógica que el webhook** (`confirmBookingPayment`) y lo sube a
 * Sentry como `error`, porque un webhook perdido es un fallo de
 * configuración que hay que mirar.
 *
 * Por qué es seguro asentarlo desde aquí:
 *  - El PaymentIntent se lee de la API de Stripe con nuestra clave: es
 *    una fuente al menos tan fiable como un evento firmado.
 *  - `confirmBookingPayment` es idempotente y sus escrituras son
 *    condicionales a `pending`. Si el webhook llega después (o a la vez),
 *    verá la reserva ya resuelta y no hará nada, o reembolsará con la
 *    misma clave de idempotencia de los caminos automáticos.
 *  - Usa como `paidAt` el instante real del cargo, así que aplica las
 *    mismas reglas de retención que habría aplicado el webhook: si la
 *    franja ya es de otro o ya pasó, cancela y reembolsa íntegro.
 */

/**
 * Margen desde el cobro antes de que el cron asiente el pago. Deja al
 * primer intento del webhook (y a sus primeros reintentos) llegar antes
 * que nosotros; competir con él sería seguro, pero ruidoso en Sentry.
 */
export const LOST_WEBHOOK_GRACE_MS = 60 * 60 * 1000;

/**
 * Antigüedad a partir de la cual una `pending` que el cron no puede
 * resolver se reporta a Sentry. Con el cron diario equivale a "a partir
 * del segundo salto".
 */
export const STUCK_PENDING_REPORT_MS = 24 * 60 * 60 * 1000;

/**
 * Intenta asentar el pago de una `pending` cuyo PaymentIntent Stripe
 * da por cobrado.
 *
 * @param booking — reserva `pending` con la retención vencida.
 * @param now — instante de proceso.
 * @returns la transición aplicada (para avisar al cliente), o `null` si
 *   todavía no toca asentarla o no se puede hacer con seguridad.
 * @throws cualquier error de Stripe o de BD; el cron lo cuenta como `failed`.
 */
export async function settleLostWebhookPayment(
  booking: CheckoutBookingRow,
  now: Date,
): Promise<BookingTransitionResult | null> {
  const paymentIntentId = booking.stripePaymentIntentId;
  if (!paymentIntentId) return null;

  const { intent, charge } = await retrievePaymentIntentWithCharge(paymentIntentId);

  // `requires_capture` no se da hoy (captura automática). Si algún día
  // aparece, asentar exigiría capturar antes: lo dejamos a soporte.
  if (intent.status !== 'succeeded' || !charge) {
    reportStuckPendingBooking(
      booking,
      now,
      `PaymentIntent ${intent.status} without settleable charge`,
    );
    return null;
  }
  // Alguien ya devolvió dinero de este cargo (a mano desde el dashboard,
  // o una disputa). Asentarlo confirmaría una cita reembolsada o emitiría
  // un segundo reembolso: no se toca y lo decide soporte.
  if (charge.refunded || charge.amount_refunded > 0) {
    reportStuckPendingBooking(booking, now, 'charge already refunded');
    return null;
  }
  const paidAt = new Date(charge.created * 1000);
  if (now.getTime() - paidAt.getTime() < LOST_WEBHOOK_GRACE_MS) return null;

  const result = await confirmBookingPayment(intent, { paidAt, now });
  reportCheckoutWarning(
    `Booking ${booking.id} was paid at ${paidAt.toISOString()} but payment_intent.succeeded was never processed; settled by the expiry cron as ${result.status}. Check the Stripe webhook endpoint.`,
    booking.id,
    'error',
  );
  return result;
}

/**
 * Reporta a Sentry una `pending` que el cron no consigue resolver, solo
 * si lleva más de `STUCK_PENDING_REPORT_MS` creada: antes es ruido, el
 * pago puede estar en curso o el webhook en camino.
 *
 * @param reason — motivo técnico en inglés (va a los logs).
 * @param level — `error` si hay dinero cobrado en juego; `warning` si no.
 */
export function reportStuckPendingBooking(
  booking: Pick<CheckoutBookingRow, 'id' | 'createdAt'>,
  now: Date,
  reason: string,
  level: 'warning' | 'error' = 'error',
): void {
  if (now.getTime() - booking.createdAt.getTime() < STUCK_PENDING_REPORT_MS) return;
  console.error(`[checkout/expiry] stuck pending booking ${booking.id}: ${reason}`);
  reportCheckoutWarning(
    `Booking ${booking.id} has been pending for over 24h: ${reason}.`,
    booking.id,
    level,
  );
}
