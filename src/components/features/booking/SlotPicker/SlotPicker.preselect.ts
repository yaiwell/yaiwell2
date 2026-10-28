'use client';

import { useEffect, useRef } from 'react';

// Import directo al archivo client-safe, nunca al barrel del módulo.
import type { BookingSlot } from '@/lib/services/availability/availability.client';

/**
 * Preselección de un hueco al llegar desde una etiqueta de oferta
 * («Hueco liberado · −20 % · 17:00» → `reservar?slot=ISO`).
 *
 * Va aparte de `SlotPicker.logic.ts` para que ese hook no pase de las
 * ~250 líneas y para poder probar las funciones puras sin React.
 */

/**
 * Día (00:00 local) que debe abrir la tira para enseñar `slotIso`.
 *
 * Devuelve `null` si no hay hueco pedido o si cae fuera de la ventana
 * visible (pasado o más allá de `visibleDays`): entonces se abre hoy,
 * como siempre. Trabajamos con el día local del dispositivo porque es
 * el mismo criterio con el que se construyen las pestañas.
 *
 * @param slotIso — inicio del hueco pedido en la URL (ya validado).
 * @param now — instante de referencia del selector.
 * @param visibleDays — número de días navegables de la tira.
 */
export function getInitialDayForSlot(
  slotIso: string | null | undefined,
  now: Date,
  visibleDays: number,
): Date | null {
  if (!slotIso) return null;
  const slot = new Date(slotIso);
  if (Number.isNaN(slot.getTime())) return null;

  const day = new Date(slot.getFullYear(), slot.getMonth(), slot.getDate());
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const lastDay = new Date(today);
  lastDay.setDate(today.getDate() + visibleDays - 1);

  if (day < today || day > lastDay) return null;
  return day;
}

/**
 * Busca el hueco pedido entre los que ofrece el día.
 *
 * Compara instantes y no strings: `…T15:00:00Z` y `…T15:00:00.000Z` son
 * el mismo hueco aunque se escriban distinto.
 */
export function findSlotByStart(
  slots: BookingSlot[],
  slotIso: string | null | undefined,
): BookingSlot | null {
  if (!slotIso) return null;
  const target = new Date(slotIso).getTime();
  if (Number.isNaN(target)) return null;
  return slots.find((slot) => new Date(slot.startAtIso).getTime() === target) ?? null;
}

/**
 * Selecciona una sola vez el hueco pedido en cuanto aparece en la lista.
 *
 * No pisa una elección previa (por ejemplo, un borrador recuperado tras
 * iniciar sesión) y no insiste si el hueco ya no está: el usuario ve el
 * día con lo que queda libre y elige otro.
 */
export function useSlotPreselection(args: {
  initialSlotIso: string | null | undefined;
  slots: BookingSlot[];
  selectedStartIso: string | null;
  onSelect: (slot: BookingSlot) => void;
}) {
  const { initialSlotIso, slots, selectedStartIso, onSelect } = args;
  const doneRef = useRef(false);

  useEffect(() => {
    if (doneRef.current || !initialSlotIso) return;
    if (selectedStartIso !== null) {
      doneRef.current = true;
      return;
    }
    const slot = findSlotByStart(slots, initialSlotIso);
    if (!slot || !slot.available) return;
    doneRef.current = true;
    onSelect(slot);
  }, [initialSlotIso, slots, selectedStartIso, onSelect]);
}
