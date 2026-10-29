/**
 * Cancelación de una reserva por el propio cliente desde `/mis-reservas`
 * (§4.bis de CLAUDE.md, decidido 2026-10-29).
 *
 * Este servicio solo sabe de estados; el dinero (reembolso o cancelación
 * del PaymentIntent) lo resuelve `checkout`, igual que con el proveedor.
 */

import { isLastMinuteAtCreation } from '@/lib/utils/booking-last-minute';

import {
  assertCancellableStatus,
  assertCancellationWindow,
  commitCancellation,
} from './booking.cancel';
import {
  BookingNotFoundError,
  BookingTooLateToCancelError,
  LastMinuteBookingNotCancellableError,
  UnauthorizedCancellationError,
} from './booking.errors';
import { bookingRepository } from './booking.repository';
import { cancelBookingSchema } from './booking.validation';

/**
 * Cancela una reserva a petición de su cliente.
 *
 * Reglas, en este orden:
 *  1. Solo el cliente que la hizo (`Booking.clientId`) puede cancelarla.
 *  2. Solo se cancelan `pending` y `confirmed`.
 *  3. `confirmed` (pagada):
 *     - de última hora (empezaba a menos de 2 h de crearse): nunca, se
 *       pagó sabiendo que no admite devolución;
 *     - el resto, hasta 2 h antes de `startAt` (límite incluido), igual
 *       que el centro.
 *  4. `pending` (sin cobro): hasta el inicio, sea o no de última hora
 *     (decidido 2026-10-29). No hay dinero que proteger y cancelarla solo
 *     libera el hueco antes de que caduque la retención. Si el pago entra
 *     justo en la carrera, `checkout` lo reembolsa: no podemos quedarnos
 *     un cobro sin cita.
 *
 * La última hora va antes que la ventana para que el cliente reciba el
 * motivo real («no admite cancelación»), no un «llegas tarde» engañoso.
 *
 * La oferta con descuento de origen **no** se retira: la hora vuelve a
 * anunciarse con su descuento vigente (ver `commitCancellation`).
 *
 * @param input — payload crudo con el `bookingId` (validado con Zod).
 * @param clientUserId — `User.id` interno del cliente autenticado.
 * @param now — instante de referencia; inyectable para tests.
 * @returns la reserva ya cancelada más `previousStatus`.
 * @throws BookingNotFoundError — la reserva no existe.
 * @throws UnauthorizedCancellationError — la reserva es de otro cliente.
 * @throws BookingNotCancellableError — su estado no admite cancelación
 *   (o cambió en paralelo antes de escribir).
 * @throws LastMinuteBookingNotCancellableError — confirmada de última hora.
 * @throws BookingTooLateToCancelError — faltan menos de 2 h (o, si está
 *   pendiente, ya ha empezado).
 */
export async function cancelBookingByClient(
  input: unknown,
  clientUserId: string,
  now: Date = new Date(),
) {
  const { bookingId } = cancelBookingSchema.parse(input);

  const booking = await bookingRepository.findById(bookingId);
  if (!booking) {
    throw new BookingNotFoundError();
  }
  if (booking.clientId !== clientUserId) {
    throw new UnauthorizedCancellationError();
  }

  assertCancellableStatus(booking);
  if (booking.status === 'pending') {
    if (booking.startAt.getTime() <= now.getTime()) {
      throw new BookingTooLateToCancelError();
    }
  } else {
    if (isLastMinuteAtCreation(booking.startAt, booking.createdAt)) {
      throw new LastMinuteBookingNotCancellableError();
    }
    assertCancellationWindow(booking, now);
  }

  return commitCancellation(booking, now, { retireOffer: false });
}
