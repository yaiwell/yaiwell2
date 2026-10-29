/**
 * Pasos comunes a toda cancelación de una reserva, la pida el centro o
 * el cliente (§4.bis de CLAUDE.md).
 *
 * Cada servicio de cancelación decide **quién** puede cancelar y con
 * qué reglas propias (titularidad, última hora…); lo que comparten —qué
 * estados se cancelan, la ventana de 2 h y cómo se persiste el cambio—
 * vive aquí para que las dos políticas no puedan divergir sin querer.
 */

import type { BookingStatus } from '@prisma/client';

import { retireOfferOfCancelledBooking } from '@/lib/services/slot-offers';
import { canCancelBooking } from '@/lib/utils/booking-cancellation';

import { BookingNotCancellableError, BookingTooLateToCancelError } from './booking.errors';
import { bookingRepository } from './booking.repository';

/** Subconjunto de la reserva que necesitan las comprobaciones comunes. */
interface CancellableBooking {
  id: string;
  status: BookingStatus;
  startAt: Date;
  slotOfferId: string | null;
}

/** Opciones de la escritura de la cancelación. */
export interface CommitCancellationOptions {
  /**
   * Retirar la oferta con descuento con la que se vendió la reserva.
   *
   * - Centro (`true`): la retira; decide él si vuelve a liberar la hora.
   * - Cliente (`false`): la oferta sigue activa y, como «vendida» se
   *   deriva de que haya una reserva activa, la hora vuelve a anunciarse
   *   sola con su descuento por tramos vigente.
   */
  retireOffer: boolean;
}

/**
 * Comprueba que la reserva está en un estado cancelable.
 *
 * Va antes que la ventana de 2 h a propósito: sobre una reserva ya
 * cancelada el mensaje correcto es «ya no se puede cancelar», no «llegas
 * tarde». Además corta cualquier intento de emitir un segundo reembolso
 * sobre el mismo cobro.
 *
 * @throws BookingNotCancellableError — si no está `pending` ni `confirmed`.
 */
export function assertCancellableStatus(booking: CancellableBooking): void {
  if (booking.status !== 'pending' && booking.status !== 'confirmed') {
    throw new BookingNotCancellableError();
  }
}

/**
 * Comprueba la ventana de 2 h frente a `now` (límite incluido: a 2h00 se
 * acepta). Delega en `canCancelBooking`, el mismo util que usa la UI,
 * para que el umbral viva en un solo sitio.
 *
 * @throws BookingTooLateToCancelError — si faltan menos de 2 h.
 */
export function assertCancellationWindow(booking: CancellableBooking, now: Date): void {
  if (!canCancelBooking({ startAt: booking.startAt, status: booking.status }, now)) {
    throw new BookingTooLateToCancelError();
  }
}

/**
 * Persiste la cancelación con una escritura condicional y libera lo que
 * colgaba de la reserva.
 *
 * Si la reserva dejó de estar activa entre la lectura del servicio y la
 * escritura (cancelación simultánea, webhook), se lanza
 * `BookingNotCancellableError` **antes** de que el caller toque el pago
 * o mande avisos: así no hay reembolsos ni correos contradictorios.
 *
 * Tras escribir se relee la fila: el `stripePaymentIntentId` pudo
 * anclarse después de nuestra lectura (checkout abierto en otra pestaña)
 * y el caller de pagos necesita el valor real.
 *
 * Devuelve además el estado leído justo antes de cancelar: el caller de
 * pagos lo necesita para saber si había cobro (`confirmed`) o solo un
 * intent vivo (`pending`).
 *
 * @param booking — reserva ya validada por el servicio que cancela.
 * @param cancelledAt — instante de la cancelación.
 * @param options — qué hacer con la oferta de origen.
 * @throws BookingNotCancellableError — la reserva ya no estaba activa.
 */
export async function commitCancellation(
  booking: CancellableBooking,
  cancelledAt: Date,
  options: CommitCancellationOptions,
) {
  const changed = await bookingRepository.cancelIfActive(booking.id, cancelledAt);
  if (changed === 0) {
    throw new BookingNotCancellableError();
  }
  const cancelled = await bookingRepository.findById(booking.id);
  if (!cancelled) {
    // Borrada justo después de cancelarla: nada que liquidar.
    throw new BookingNotCancellableError();
  }
  if (options.retireOffer && booking.slotOfferId) {
    await retireOfferOfCancelledBooking(booking.slotOfferId, cancelledAt);
  }
  return { ...cancelled, previousStatus: booking.status };
}
