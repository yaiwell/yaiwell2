'use client';

import { isLastMinuteBooking } from '@/lib/utils/booking-last-minute';

import { useTickingNow } from '../shared/useTickingNow';

/**
 * Estima si el hueco elegido es una reserva de última hora (< 2 h).
 *
 * Es solo una estimación con el reloj del navegador, válida para los
 * pasos previos al checkout. Una vez creada la reserva manda el valor
 * que calcula el servidor (`checkout.isLastMinute`).
 *
 * No vive en `useBookingFlow` porque ese fichero pasaría de las ~250
 * líneas, y porque es un dato derivado del reloj, no del flujo.
 *
 * @param slotStartIso — inicio del hueco elegido, o `null` si no hay.
 * @param now — instante fijo para tests; si se pasa, no hay intervalo.
 */
export function useIsLastMinuteSlot(slotStartIso: string | null, now?: Date): boolean {
  const current = useTickingNow(now, slotStartIso !== null);
  if (!slotStartIso) return false;
  return isLastMinuteBooking(slotStartIso, current);
}
