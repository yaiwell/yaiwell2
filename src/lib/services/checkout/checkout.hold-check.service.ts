import 'server-only';

import { isBookingHoldingSlot, PENDING_HOLD_PAYMENT_MARGIN_MS } from '@/lib/services/booking';
import { isBookingPaymentSettled } from '@/lib/utils/booking-payment-status';

import { BookingForCheckoutNotFoundError, BookingHoldExpiredError } from './checkout.errors';
import { tryExpirePendingBooking, type PendingExpiryAttempt } from './checkout.expire-one';
import { checkoutRepository, type CheckoutBookingRow } from './checkout.repository';
import { verifyBookingPayableSchema } from './checkout.validation';

/**
 * Comprobación previa al pago: ¿esta reserva todavía se puede pagar?
 *
 * El `clientSecret` solo se entrega al crear la reserva, cuando la
 * retención es nueva por definición. Pero el formulario de pago puede
 * quedarse abierto más de `PENDING_HOLD_MINUTES`, y a partir de ahí la
 * franja ya no es del cliente: si paga y otro la cogió, el webhook
 * reembolsa en automático. Esta comprobación corre en servidor justo
 * antes de confirmar el pago para avisar **antes** de cobrar.
 *
 * No sustituye a la red del webhook (un cliente puede saltársela y
 * confirmar el intent directamente contra Stripe), pero la refuerza: al
 * detectar una reserva vencida la caduca en el momento y cancela su
 * PaymentIntent, que desde ese instante ya no acepta pagos.
 */

/**
 * Desenlace de una comprobación que no bloquea el pago.
 *
 *  - `payable`: la reserva retiene su franja; se puede confirmar.
 *  - `already_paid`: ya está cobrada (o cobrándose); la UI debe pasar a
 *    la confirmación en vez de intentar pagar otra vez.
 */
export type BookingPayability = 'payable' | 'already_paid';

/**
 * Decide si el cliente puede pagar su reserva ahora.
 *
 * @param input — payload crudo `{ bookingId }` (validado con Zod).
 * @param clientUserId — `User.id` del cliente autenticado.
 * @param options.now — instante de referencia; inyectable en tests.
 * @throws BookingForCheckoutNotFoundError — no existe o es de otro cliente.
 * @throws BookingHoldExpiredError — ya no retiene su franja.
 */
export async function checkBookingPayable(
  input: unknown,
  clientUserId: string,
  options: { now?: Date } = {},
): Promise<BookingPayability> {
  const { bookingId } = verifyBookingPayableSchema.parse(input);
  const now = options.now ?? new Date();

  const booking = await checkoutRepository.findOwnedCheckoutRow(bookingId, clientUserId);
  if (!booking) {
    throw new BookingForCheckoutNotFoundError();
  }
  if (isBookingPaymentSettled(booking.status)) return 'already_paid';
  if (booking.status !== 'pending') {
    throw new BookingHoldExpiredError();
  }
  // Con el margen: si quedan menos de 2 min de retención, no da tiempo a
  // un 3D Secure y el pago se evaluaría ya vencido. Mejor elegir de nuevo.
  const paymentDeadline = new Date(now.getTime() + PENDING_HOLD_PAYMENT_MARGIN_MS);
  if (isBookingHoldingSlot(booking, paymentDeadline)) return 'payable';

  const attempt = await expireEagerly(booking, now);
  if (attempt === 'already_paid' || attempt === 'processing') return 'already_paid';
  if (attempt === 'not_pending') {
    // La fila cambió entre nuestra lectura y la caducidad: si fue el
    // webhook confirmando el pago, el cliente ya ha pagado.
    const current = await checkoutRepository.findCheckoutRow(booking.id);
    if (current && isBookingPaymentSettled(current.status)) return 'already_paid';
  }
  throw new BookingHoldExpiredError();
}

/**
 * Caduca en el momento una `pending` vencida.
 *
 * Best effort: si Stripe o la BD fallan, el cliente recibe igualmente
 * "retención vencida" y el cron de caducidad lo reintenta esa noche.
 *
 * @returns el desenlace, o `null` si no se pudo intentar. `already_paid`
 *   y `processing` significan que Stripe ya la había cobrado (otra
 *   pestaña, un 3DS que terminó tarde): el webhook la resolverá.
 */
async function expireEagerly(
  booking: CheckoutBookingRow,
  now: Date,
): Promise<PendingExpiryAttempt | null> {
  try {
    return await tryExpirePendingBooking(booking, now);
  } catch (err) {
    console.error('[checkout/hold-check] could not expire stale pending booking:', booking.id, err);
    return null;
  }
}
