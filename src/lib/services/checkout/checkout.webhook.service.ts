import 'server-only';

import type Stripe from 'stripe';

import { bookingRepository } from '@/lib/services/booking';

import { BookingForCheckoutNotFoundError, MissingBookingReferenceError } from './checkout.errors';
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
 *    terminal gana; el descuadre se resuelve por soporte, no en
 *    automático.
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
 * @throws MissingBookingReferenceError — el intent no referencia reserva.
 * @throws BookingForCheckoutNotFoundError — la reserva referenciada no existe.
 */
export async function confirmBookingPayment(
  intent: Stripe.PaymentIntent,
): Promise<BookingTransitionResult> {
  const booking = await resolveBooking(intent.metadata?.bookingId, intent.id);

  if (booking.status === 'confirmed') {
    return { bookingId: booking.id, changed: false, status: booking.status };
  }
  if (booking.status !== 'pending') {
    // `cancelled`, `refunded` o `completed`: el evento llega tarde o
    // fuera de orden. Lo registramos para poder auditarlo y no tocamos.
    console.warn(
      `[checkout/webhook] succeeded sobre reserva en estado ${booking.status}, ignorado:`,
      booking.id,
    );
    return { bookingId: booking.id, changed: false, status: booking.status };
  }

  await bookingRepository.updateStatus(booking.id, 'confirmed');
  return { bookingId: booking.id, changed: true, status: 'confirmed' };
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

  await bookingRepository.updateStatus(booking.id, 'cancelled', { cancelledAt: new Date() });
  return { bookingId: booking.id, changed: true, status: 'cancelled' };
}

/**
 * Marca como `refunded` la reserva asociada a un `charge.refunded`.
 *
 * Cubre tanto el reembolso que dispara la plataforma (cancelación del
 * proveedor) como el que se haga a mano desde el dashboard de Stripe:
 * en ambos casos la fuente de verdad del estado es este evento, no quien
 * lo originó.
 *
 * Stripe copia la metadata del PaymentIntent al Charge, así que la ruta
 * normal es la misma. Si faltara, caemos a buscar por el id del intent.
 */
export async function refundBookingPayment(
  charge: Stripe.Charge,
): Promise<BookingTransitionResult> {
  const paymentIntentId =
    typeof charge.payment_intent === 'string' ? charge.payment_intent : charge.payment_intent?.id;
  const booking = await resolveBooking(charge.metadata?.bookingId, paymentIntentId);

  if (booking.status === 'refunded') {
    return { bookingId: booking.id, changed: false, status: booking.status };
  }
  // `cancelled` entra en la lista porque es justo el estado en el que
  // deja la reserva una cancelación del proveedor: primero cancelamos en
  // BD y después emitimos el refund, así que el `charge.refunded` que
  // dispara nuestro propio reembolso llega siempre sobre una reserva ya
  // cancelada. Sin esto caería en el warn de abajo y la reserva nunca
  // alcanzaría `refunded`.
  //
  // No viola el principio de no-resurrección (DO.md, 2026-08-31): ese
  // principio impide volver a un estado *anterior* del flujo, como
  // revivir a `confirmed` una reserva muerta. `refunded` no revive nada
  // — es el estado terminal más informativo del mismo ramal que
  // `cancelled`: dice que además de cancelada, el dinero volvió.
  if (
    booking.status !== 'confirmed' &&
    booking.status !== 'completed' &&
    booking.status !== 'cancelled'
  ) {
    console.warn(
      `[checkout/webhook] refund sobre reserva en estado ${booking.status}, ignorado:`,
      booking.id,
    );
    return { bookingId: booking.id, changed: false, status: booking.status };
  }

  await bookingRepository.updateStatus(booking.id, 'refunded', { cancelledAt: new Date() });
  return { bookingId: booking.id, changed: true, status: 'refunded' };
}

/**
 * Resuelve la reserva de un evento: primero por `metadata.bookingId`
 * (camino normal, sin índice que mantener), y si no viene, buscando por
 * el id del PaymentIntent anclado en la reserva.
 *
 * Cuando llegamos por metadata verificamos además que el intent anclado
 * en BD coincide con el del evento. La firma del webhook ya garantiza
 * que el evento viene de Stripe, pero no que apunte a la reserva que
 * dice: este chequeo evita que un intent de otro flujo mueva un booking
 * ajeno si alguien manipulase la metadata al crearlo.
 */
async function resolveBooking(
  bookingIdFromMetadata: string | undefined,
  paymentIntentId: string | undefined,
): Promise<{ id: string; status: string }> {
  if (bookingIdFromMetadata) {
    const booking = await bookingRepository.findById(bookingIdFromMetadata);
    if (!booking) {
      throw new BookingForCheckoutNotFoundError();
    }
    if (
      paymentIntentId &&
      booking.stripePaymentIntentId &&
      booking.stripePaymentIntentId !== paymentIntentId
    ) {
      throw new BookingForCheckoutNotFoundError(
        'El PaymentIntent del evento no coincide con el anclado en la reserva.',
      );
    }
    return { id: booking.id, status: booking.status };
  }

  if (paymentIntentId) {
    const booking = await checkoutRepository.findByPaymentIntentId(paymentIntentId);
    if (!booking) {
      throw new BookingForCheckoutNotFoundError();
    }
    return { id: booking.id, status: booking.status };
  }

  throw new MissingBookingReferenceError();
}
