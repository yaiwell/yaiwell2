import type { BookingStatus, SlotOfferStatus } from '@prisma/client';

import { getEarliestBookableStart } from '@/lib/utils/booking-lead-time';

/** Lo mínimo de la reserva que decide si su hueco se puede liberar. */
export interface ReleasableInput {
  status: BookingStatus;
  startAt: Date;
  /** Oferta ya creada a partir de esta reserva (una por reserva). */
  releasedAs: { id: string } | null;
  /** Oferta con la que se vendió la reserva, si la hubo. */
  slotOffer: { status: SlotOfferStatus } | null;
}

/**
 * Indica si el panel debe ofrecer «Liberar con descuento» sobre una
 * reserva cancelada (§4.bis, huecos liberados, caso a).
 *
 * Vale para cualquier cancelación, la hiciera el centro o el cliente:
 * `releaseCancelledSlot` no distingue quién canceló y es la fuente de
 * verdad (titularidad, solapes, servicio). Aquí solo se filtra lo que
 * seguro fallaría, para no ofrecer un botón que acaba en error:
 *  - la reserva no está cancelada ni reembolsada;
 *  - la hora ya no admite reservas (menos de 30 min de antelación);
 *  - ya se creó una oferta desde esta reserva (`sourceBookingId` único);
 *  - se vendió con una oferta que sigue activa: al cancelar el cliente
 *    esa oferta vuelve a anunciarse sola, y otra solaparía con ella.
 *
 * @param booking — reserva leída de BD.
 * @param now — reloj del servidor.
 */
export function isCancelledSlotReleasable(booking: ReleasableInput, now: Date): boolean {
  if (booking.status !== 'cancelled' && booking.status !== 'refunded') return false;
  if (booking.startAt < getEarliestBookableStart(now)) return false;
  if (booking.releasedAs) return false;
  return booking.slotOffer?.status !== 'active';
}
