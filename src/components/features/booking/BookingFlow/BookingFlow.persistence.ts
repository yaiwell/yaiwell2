'use client';

import { useEffect, useState, type Dispatch, type SetStateAction } from 'react';

import { restoreBookingDraft, saveBookingDraft } from './BookingFlow.draft';
import type { BookingDraft } from './BookingFlow.types';

/**
 * Estado del borrador de reserva atado a `sessionStorage`.
 *
 * Va en su propio archivo para que `BookingFlow.logic.ts` siga
 * ocupándose de los pasos y el checkout, y no de la hidratación. La
 * escritura en almacenamiento vive un nivel más abajo, en
 * `BookingFlow.draft.ts`, que no sabe nada de React.
 */

/** Estado inicial, antes de intentar hidratar. */
const EMPTY_DRAFT: BookingDraft = {
  slotStartIso: null,
  slotEndIso: null,
  notes: '',
  bookingId: null,
};

export interface BookingDraftState {
  draft: BookingDraft;
  setDraft: Dispatch<SetStateAction<BookingDraft>>;
  /** `true` si el borrador traía un hueco que ya no admite reserva. */
  slotExpired: boolean;
  setSlotExpired: Dispatch<SetStateAction<boolean>>;
}

/**
 * Gestiona el borrador: lo recupera al montar y lo guarda al cambiar.
 *
 * @param serviceId — servicio del flujo; un borrador de otro servicio
 *   se descarta.
 */
export function useBookingDraft(serviceId: string): BookingDraftState {
  const [draft, setDraft] = useState<BookingDraft>(EMPTY_DRAFT);
  const [slotExpired, setSlotExpired] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  // Hidratación. Sólo en el montaje: leer `sessionStorage` exige
  // `window`, así que es un caso legítimo de `setState` dentro de un
  // efecto (no hay alternativa SSR-safe).
  useEffect(() => {
    const restored = restoreBookingDraft(serviceId);
    if (restored) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDraft(restored.draft);
      setSlotExpired(restored.slotExpired);
    }
    setHydrated(true);
  }, [serviceId]);

  // Persistimos tras cada cambio. Antes de hidratar no escribimos: el
  // borrador vacío inicial machacaría lo guardado.
  useEffect(() => {
    if (!hydrated) return;
    saveBookingDraft(serviceId, draft);
  }, [draft, hydrated, serviceId]);

  return { draft, setDraft, slotExpired, setSlotExpired };
}
