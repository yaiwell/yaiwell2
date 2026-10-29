import 'server-only';

import type Stripe from 'stripe';

import { resolveBooking } from './checkout.booking-resolver';
import {
  refundPaymentOnCancelledBooking,
  settlePaymentOnPendingBooking,
} from './checkout.late-payment.service';
import type { BookingTransitionResult } from './checkout.types';

/**
 * Transiciones de estado de una reserva disparadas por webhooks de
 * Stripe.
 *
 * Principios que gobiernan este archivo:
 *
 *  - **Idempotencia.** Stripe reintenta y puede entregar el mismo evento
 *    varias veces, y en cualquier orden. Cada transición comprueba el
 *    estado actual y devuelve `changed: false` si no hay nada que hacer,
 *    en vez de reaplicar o fallar.
 *  - **Sin resurrecciones.** Una reserva cancelada o reembolsada no
 *    vuelve a `confirmed` porque llegue tarde un `succeeded`. El estado
 *    terminal gana; si el dinero llegó a cobrarse sobre una reserva
 *    cancelada, se devuelve en automático (ver
 *    `checkout.late-payment.service.ts`).
 *  - **Nunca lanzar por eventos ajenos.** Si el evento no referencia una
 *    reserva nuestra, se registra y se responde 200 para que Stripe deje
 *    de reintentar.
 */

/**
 * Confirma la reserva asociada a un `payment_intent.succeeded`.
 *
 * Es el único camino por el que una reserva pasa a `confirmed`: el
 * cliente no confirma nada desde el navegador, lo hace el webhook con
 * el dinero ya capturado.
 *
 * Toda la decisión sobre una `pending` (confirmar condicionalmente, o
 * cancelar y reembolsar si la franja pasó o es de otro) y sobre una
 * `cancelled` (reembolsar) la toma `checkout.late-payment.service`.
 *
 * La retención se evalúa con `paidAt` (instante del pago según Stripe),
 * no con la hora de proceso; aun así no protege ante retrasos del
 * webhook (ver JSDoc de `checkout.late-payment.service`).
 *
 * @param options.paidAt — `event.created` del evento; por defecto `now`.
 * @param options.now — instante de proceso; inyectable en tests.
 * @throws MissingBookingReferenceError — el intent no referencia reserva.
 * @throws BookingForCheckoutNotFoundError — la reserva referenciada no existe.
 */
export async function confirmBookingPayment(
  intent: Stripe.PaymentIntent,
  options: { paidAt?: Date; now?: Date } = {},
): Promise<BookingTransitionResult> {
  const now = options.now ?? new Date();
  const paidAt = options.paidAt ?? now;
  const booking = await resolveBooking(intent.metadata?.bookingId, intent.id);

  switch (booking.status) {
    case 'confirmed':
      return { bookingId: booking.id, changed: false, status: booking.status };
    case 'pending':
      return settlePaymentOnPendingBooking(booking, intent.id, { paidAt, now });
    case 'cancelled':
      return refundPaymentOnCancelledBooking(booking, intent.id);
    default:
      // `refunded` o `completed`: evento tardío o fuera de orden sobre una
      // reserva cuyo dinero ya está resuelto. Se registra y no se toca.
      console.warn(
        `[checkout/webhook] succeeded sobre reserva en estado ${booking.status}, ignorado:`,
        booking.id,
      );
      return { bookingId: booking.id, changed: false, status: booking.status };
  }
}

/**
 * Registra un `payment_intent.payment_failed` **sin cancelar** la reserva.
 *
 * Un intento fallido no es el final del pago: el Payment Element deja al
 * cliente reintentar con otra tarjeta sobre el **mismo** PaymentIntent.
 * Si cancelásemos aquí, ese segundo intento cobraría sobre una reserva ya
 * cancelada y acabaría en reembolso automático: el dinero vuelve, pero
 * el cliente pierde la cita que acaba de pagar.
 *
 * Dejar la `pending` viva no bloquea la franja más de la cuenta: deja de
 * retenerla al vencer `PENDING_HOLD_MINUTES` (`isBookingHoldingSlot`), la
 * página de pago no deja pagar una reserva vencida y el cron de
 * caducidad la cancela junto con su PaymentIntent.
 *
 * Se sigue resolviendo la reserva para que un evento ajeno al
 * marketplace responda `handled: false` igual que el resto.
 */
export async function failBookingPayment(
  intent: Stripe.PaymentIntent,
): Promise<BookingTransitionResult> {
  const booking = await resolveBooking(intent.metadata?.bookingId, intent.id);
  if (booking.status === 'pending') {
    // Solo el código de Stripe: el mensaje puede incluir datos de la tarjeta.
    console.warn(
      `[checkout/webhook] payment attempt failed (${intent.last_payment_error?.code ?? 'unknown'}); booking stays pending for retry:`,
      booking.id,
    );
  }
  return { bookingId: booking.id, changed: false, status: booking.status };
}
