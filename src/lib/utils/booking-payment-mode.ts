/**
 * Modos de pago de una reserva y regla de antelación del pago en el local
 * (CLAUDE.md §4.bis, decidido 2026-10-29).
 *
 * Sin dependencias de servidor ni de Prisma: lo importan el selector de
 * método de pago (cliente) y `checkout` (servidor) para aplicar el mismo
 * umbral de 2 h.
 */

import { isLastMinuteAtCreation } from './booking-last-minute';

/** Modos de pago, en el mismo orden que el enum `BookingPaymentMode`. */
export const BOOKING_PAYMENT_MODES = ['online', 'onsite'] as const;

/** Modo de pago de una reserva (espejo del enum de Prisma, apto para cliente). */
export type BookingPaymentModeValue = (typeof BOOKING_PAYMENT_MODES)[number];

/**
 * Si la antelación permite pagar en el local: solo con 2 h o más entre
 * `now` (cuando se reserva) y el inicio. A 2h00 justas se permite; a
 * 1h59 la reserva es de última hora y se paga online sin devolución.
 *
 * Es la negación exacta de `isLastMinuteAtCreation`, para que las dos
 * reglas nunca dejen un hueco ni se solapen en la frontera.
 *
 * @param slotStart — inicio del hueco elegido.
 * @param now — instante en que se reserva.
 */
export function isOnsiteAllowedByLeadTime(slotStart: Date, now: Date): boolean {
  return !isLastMinuteAtCreation(slotStart, now);
}
