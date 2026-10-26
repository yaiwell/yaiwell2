import 'server-only';

import type Stripe from 'stripe';

import { getStripeClient } from '@/lib/integrations/stripe';
import { bookingRepository } from '@/lib/services/booking';

import { resolveBooking } from './checkout.booking-resolver';
import type { CheckoutBookingRow } from './checkout.repository';
import type { BookingTransitionResult } from './checkout.types';

/**
 * `charge.refunded`: paso de la reserva a `refunded`.
 *
 * Es lo que saca la reserva de la cola de reembolsos de /admin (rellena
 * `refundedAt`), así que solo puede ocurrir cuando el dinero ha vuelto
 * de verdad. Stripe emite `charge.refunded` al **crear** el refund, y un
 * refund puede fallar después (`charge.refund.updated` → `failed`); los
 * eventos además llegan en cualquier orden. Por eso, antes de marcar:
 *
 *  1. El cargo tiene que estar reembolsado entero (`charge.refunded`).
 *     Un refund parcial (cortesía manual) no convierte la reserva en
 *     reembolsada.
 *  2. Nuestro refund (`stripeRefundId`) no puede figurar como `failed`.
 *     Si el evento no trae `charge.refunds` (no viene expandido en las
 *     versiones recientes de la API), se consulta el refund en Stripe.
 *  3. Si la fila registró un fallo **posterior** al evento, el evento
 *     está obsoleto: llegó tarde y no puede tapar ese fallo.
 */

/** Estados desde los que un reembolso total lleva a `refunded`. */
const REFUNDABLE_STATUSES = new Set(['confirmed', 'completed', 'cancelled']);

/**
 * Marca como `refunded` la reserva asociada a un `charge.refunded`.
 *
 * Cubre el reembolso que dispara la plataforma y el manual del
 * dashboard. `cancelled` entra entre los estados de origen porque es
 * justo donde deja la reserva una cancelación del proveedor (BD primero,
 * refund después); no es una resurrección: `refunded` es el terminal más
 * informativo del mismo ramal.
 *
 * @param charge — objeto `Charge` del evento.
 * @param options.eventCreatedAt — `event.created`; descarta eventos
 *   anteriores al último fallo registrado.
 */
export async function refundBookingPayment(
  charge: Stripe.Charge,
  options: { eventCreatedAt?: Date } = {},
): Promise<BookingTransitionResult> {
  const paymentIntentId =
    typeof charge.payment_intent === 'string' ? charge.payment_intent : charge.payment_intent?.id;
  const booking = await resolveBooking(charge.metadata?.bookingId, paymentIntentId);
  const unchanged = { bookingId: booking.id, changed: false, status: booking.status };

  if (booking.status === 'refunded') return unchanged;
  if (!REFUNDABLE_STATUSES.has(booking.status)) {
    console.warn(`[checkout/webhook] refund on ${booking.status} booking ignored:`, booking.id);
    return unchanged;
  }
  if (charge.refunded !== true) {
    // Reembolso parcial: el dinero de la reserva no ha vuelto entero.
    return unchanged;
  }
  if (isStaleAgainstFailure(booking, options.eventCreatedAt)) {
    console.warn('[checkout/webhook] stale charge.refunded after refund failure:', booking.id);
    return unchanged;
  }
  if (await hasOwnRefundFailed(booking, charge)) {
    console.warn('[checkout/webhook] own refund failed; booking left in queue:', booking.id);
    return unchanged;
  }

  const now = new Date();
  await bookingRepository.updateStatus(booking.id, 'refunded', {
    cancelledAt: now,
    refundedAt: now,
  });
  return { bookingId: booking.id, changed: true, status: 'refunded' };
}

/** ¿Hay un fallo de refund registrado después de que Stripe emitiera el evento? */
function isStaleAgainstFailure(booking: CheckoutBookingRow, eventCreatedAt?: Date): boolean {
  if (!booking.refundFailedAt || !eventCreatedAt) return false;
  return booking.refundFailedAt.getTime() > eventCreatedAt.getTime();
}

/**
 * ¿Nuestro refund figura como fallido? Primero en el propio cargo; si no
 * viene la lista, consultando el refund en Stripe.
 */
async function hasOwnRefundFailed(
  booking: CheckoutBookingRow,
  charge: Stripe.Charge,
): Promise<boolean> {
  if (!booking.stripeRefundId) return false;

  const embedded = charge.refunds?.data?.find((refund) => refund.id === booking.stripeRefundId);
  if (embedded) return embedded.status === 'failed';

  const refund = await getStripeClient().refunds.retrieve(booking.stripeRefundId);
  return refund.status === 'failed';
}
