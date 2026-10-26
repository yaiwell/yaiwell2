import 'server-only';

import type Stripe from 'stripe';

import { resolveBooking } from './checkout.booking-resolver';
import {
  refundPaymentOnCancelledBooking,
  settlePaymentOnPendingBooking,
} from './checkout.late-payment.service';
import { checkoutRepository } from './checkout.repository';
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
 * Cancela la reserva asociada a un `payment_intent.payment_failed`.
 *
 * Liberar el slot es lo correcto aquí: la reserva nunca llegó a pagarse,
 * y mantener el `pending` bloquearía la franja para el resto de clientes
 * que sí pueden pagarla. Si el cliente reintenta, crea una reserva nueva.
 */
export async function failBookingPayment(
  intent: Stripe.PaymentIntent,
): Promise<BookingTransitionResult> {
  const booking = await resolveBooking(intent.metadata?.bookingId, intent.id);

  if (booking.status !== 'pending') {
    return { bookingId: booking.id, changed: false, status: booking.status };
  }

  // Condicional: si otro camino (pago confirmado en paralelo) movió la
  // fila desde nuestra lectura, no la pisamos.
  if (await checkoutRepository.cancelIfPending(booking.id, new Date())) {
    return { bookingId: booking.id, changed: true, status: 'cancelled' };
  }
  const current = await checkoutRepository.findCheckoutRow(booking.id);
  return { bookingId: booking.id, changed: false, status: current?.status ?? booking.status };
}
