// Import directo al archivo client-safe, nunca al barrel del módulo.
import type { BookingSlot } from '@/lib/services/availability/availability.client';
import { isLastMinuteBooking } from '@/lib/utils/booking-last-minute';

import { splitSlotsByDayPart } from './SlotPicker.logic';

/** Huecos del día repartidos en los grupos que pinta el selector. */
export interface SlotGroups {
  /** Empiezan en menos de 2 h: pago al reservar, sin cancelación. */
  lastMinute: BookingSlot[];
  morning: BookingSlot[];
  afternoon: BookingSlot[];
}

/**
 * Separa los huecos de última hora del resto y reparte el resto en
 * mañana/tarde.
 *
 * Los de última hora van en un grupo propio, con su etiqueta, en vez de
 * marcarse uno a uno: así la condición (pago al reservar, sin
 * cancelación) se lee una vez y no depende del color de cada botón.
 *
 * @param slots — huecos tal y como los devuelve la API.
 * @param now — instante de referencia para el umbral de 2 h.
 */
export function groupSlots(slots: BookingSlot[], now: Date): SlotGroups {
  const lastMinute: BookingSlot[] = [];
  const rest: BookingSlot[] = [];
  for (const slot of slots) {
    if (isLastMinuteBooking(slot.startAtIso, now)) lastMinute.push(slot);
    else rest.push(slot);
  }
  return { lastMinute, ...splitSlotsByDayPart(rest) };
}
