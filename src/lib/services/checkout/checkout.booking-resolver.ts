import 'server-only';

import { bookingRepository } from '@/lib/services/booking';

import { BookingForCheckoutNotFoundError, MissingBookingReferenceError } from './checkout.errors';
import { checkoutRepository, type CheckoutBookingRow } from './checkout.repository';

/**
 * Resuelve la reserva de un evento de Stripe: primero por `metadata.bookingId`
 * (camino normal, sin índice que mantener), y si no viene, buscando por
 * el id del PaymentIntent anclado en la reserva.
 *
 * Cuando llegamos por metadata verificamos además que el intent anclado
 * en BD coincide con el del evento. La firma del webhook ya garantiza
 * que el evento viene de Stripe, pero no que apunte a la reserva que
 * dice: este chequeo evita que un intent de otro flujo mueva un booking
 * ajeno si alguien manipulase la metadata al crearlo.
 */
export async function resolveBooking(
  bookingIdFromMetadata: string | undefined,
  paymentIntentId: string | undefined,
): Promise<CheckoutBookingRow> {
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
    return {
      id: booking.id,
      status: booking.status,
      stripePaymentIntentId: booking.stripePaymentIntentId,
      professionalId: booking.professionalId,
      startAt: booking.startAt,
      endAt: booking.endAt,
      createdAt: booking.createdAt,
      stripeRefundId: booking.stripeRefundId,
      refundFailedAt: booking.refundFailedAt,
    };
  }

  if (paymentIntentId) {
    const booking = await checkoutRepository.findByPaymentIntentId(paymentIntentId);
    if (!booking) {
      throw new BookingForCheckoutNotFoundError();
    }
    return booking;
  }

  throw new MissingBookingReferenceError();
}
