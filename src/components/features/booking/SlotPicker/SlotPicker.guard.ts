'use client';

import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';

// Import directo al archivo client-safe, nunca al barrel del módulo.
import type { BookingSlot } from '@/lib/services/availability/availability.client';
import { isSlotStillBookable } from '@/lib/utils/booking-lead-time';
import { getDateKey } from '@/lib/utils/calendar-days';

import { fetchSlotsForProfessional, slotsQueryKey } from './SlotPicker.fetch';
import { findSlotByStart } from './SlotPicker.preselect';

/**
 * Vigilancia de la hora ya elegida cuando cambia la agenda consultada.
 *
 * Caso que resuelve: el cliente elige las 17:00 con «Cualquiera» y luego
 * cambia a una profesional que a esa hora no tiene hueco. La hora seguía
 * marcada en el borrador y el servidor la rechazaría al pagar. Aquí se
 * consulta el día **de la hora elegida** (que puede no ser el que se está
 * mirando) con el profesional actual y, si ya no está, se avisa al flujo
 * para que la limpie. La consulta comparte caché con la de la tira, así
 * que en el caso normal no hay petición extra.
 */

/**
 * `true` si, con los huecos de su día ya cargados, la hora elegida ya no
 * se puede reservar (no está o venció la antelación mínima).
 *
 * @param slots — huecos del día de la hora elegida.
 * @param selectedStartIso — hora elegida.
 * @param now — reloj de referencia.
 */
export function isSelectionGone(
  slots: BookingSlot[],
  selectedStartIso: string,
  now: Date,
): boolean {
  const slot = findSlotByStart(slots, selectedStartIso);
  return slot === null || !isSlotStillBookable(slot.startAtIso, now);
}

/**
 * Hook de vigilancia. Sin `onSelectionGone` no hace nada (ni pide).
 *
 * @param args.clock — reloj que avanza, el mismo que filtra la tira.
 */
export function useSelectedSlotGuard(args: {
  serviceId: string;
  professionalId: string | null;
  selectedStartIso: string | null;
  clock: Date;
  onSelectionGone?: () => void;
}) {
  const { serviceId, professionalId, selectedStartIso, clock, onSelectionGone } = args;
  const dayKey = selectedStartIso ? getDateKey(new Date(selectedStartIso)) : '';
  const enabled = Boolean(selectedStartIso && onSelectionGone);

  const query = useQuery<BookingSlot[]>({
    queryKey: slotsQueryKey(serviceId, dayKey, professionalId),
    queryFn: ({ signal }) => fetchSlotsForProfessional(serviceId, dayKey, professionalId, signal),
    staleTime: 60_000,
    enabled,
  });

  const gone =
    enabled &&
    query.isSuccess &&
    selectedStartIso !== null &&
    isSelectionGone(query.data, selectedStartIso, clock);

  useEffect(() => {
    if (gone) onSelectionGone?.();
  }, [gone, onSelectionGone]);
}
