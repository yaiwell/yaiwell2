'use client';

import { useEffect, useRef, useState } from 'react';

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
 * Resultado de buscar el hueco pedido por URL.
 *
 * - `none`: no se pidió hueco.
 * - `waiting`: aún no se puede decidir (cargando, o el usuario está
 *   mirando otro día).
 * - `found`: el hueco sigue libre.
 * - `gone`: el hueco ya no se ofrece o su día cae fuera de los visibles.
 */
export type PreselectionStatus =
  | { status: 'none' | 'waiting' | 'gone' }
  | { status: 'found'; slot: BookingSlot };

/**
 * Decide qué ha pasado con el hueco pedido por URL.
 *
 * Solo juzga con los huecos del día del propio hueco: si el usuario ya
 * ha saltado a otro día, la lista que tenemos no dice nada de él.
 *
 * @param args.initialSlotIso — hueco pedido (ya validado en la página).
 * @param args.targetDayKey — `YYYY-MM-DD` de su día, o `null` si queda
 *   fuera de la ventana visible.
 * @param args.viewedDayKey — día cuyos huecos hay en `slots`.
 * @param args.isLoaded — `true` si `slots` es una respuesta real.
 * @param args.slots — huecos reservables del día visto.
 */
export function resolvePreselection(args: {
  initialSlotIso: string | null | undefined;
  targetDayKey: string | null;
  viewedDayKey: string;
  isLoaded: boolean;
  slots: BookingSlot[];
}): PreselectionStatus {
  if (!args.initialSlotIso) return { status: 'none' };
  if (args.targetDayKey === null) return { status: 'gone' };
  if (args.viewedDayKey !== args.targetDayKey || !args.isLoaded) return { status: 'waiting' };
  const slot = findSlotByStart(args.slots, args.initialSlotIso);
  return slot && slot.available ? { status: 'found', slot } : { status: 'gone' };
}

/**
 * Selecciona una sola vez el hueco pedido en cuanto aparece en la lista
 * y avisa si ya no existe.
 *
 * No pisa una elección previa (por ejemplo, un borrador recuperado tras
 * iniciar sesión) y no insiste si el hueco ya no está: el usuario ve el
 * día con lo que queda libre y elige otro. El aviso se decide una sola
 * vez y desaparece en cuanto el usuario elige una hora.
 *
 * @returns `slotGone`: `true` mientras haya que enseñar el aviso.
 */
export function useSlotPreselection(args: {
  initialSlotIso: string | null | undefined;
  slots: BookingSlot[];
  selectedStartIso: string | null;
  onSelect: (slot: BookingSlot) => void;
  /** `YYYY-MM-DD` del día del hueco pedido; `null` si queda fuera. */
  targetDayKey: string | null;
  /** `YYYY-MM-DD` del día cuyos huecos hay en `slots`. */
  viewedDayKey: string;
  /** `true` si `slots` ya es la respuesta del servidor. */
  isLoaded: boolean;
}): { slotGone: boolean } {
  const { initialSlotIso, slots, selectedStartIso, onSelect } = args;
  const doneRef = useRef(false);
  const [goneSeen, setGoneSeen] = useState(false);

  const resolution = resolvePreselection({
    initialSlotIso,
    targetDayKey: args.targetDayKey,
    viewedDayKey: args.viewedDayKey,
    isLoaded: args.isLoaded,
    slots,
  });

  // Estado derivado durante el render (patrón de React 19) en lugar de
  // `setState` en un efecto: el aviso se fija una vez y no parpadea al
  // cambiar de día.
  if (!goneSeen && selectedStartIso === null && resolution.status === 'gone') {
    setGoneSeen(true);
  }

  const found = resolution.status === 'found' ? resolution.slot : null;
  useEffect(() => {
    if (doneRef.current || !initialSlotIso) return;
    if (selectedStartIso !== null) {
      doneRef.current = true;
      return;
    }
    if (!found) return;
    doneRef.current = true;
    onSelect(found);
  }, [initialSlotIso, found, selectedStartIso, onSelect]);

  return { slotGone: goneSeen && selectedStartIso === null };
}
