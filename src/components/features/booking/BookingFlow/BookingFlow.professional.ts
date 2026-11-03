'use client';

import { useCallback, type Dispatch, type RefObject, type SetStateAction } from 'react';

import type { PublicProfessional } from '@/types/domain';

import type { OnsiteBookingState } from './BookingFlow.onsite';
import type { BookingDraft, CheckoutState } from './BookingFlow.types';

/**
 * Elección de profesional dentro del flujo de reserva (CLAUDE.md §4.bis
 * «Equipo», decidido 2026-11-03). Va aparte de `useBookingFlow` para que
 * ese hook no pase de las ~250 líneas.
 */

/**
 * Hook con las dos transiciones del borrador ligadas al profesional.
 *
 * @param deps.draftRef — espejo del borrador para leerlo sin dependencias.
 * @param deps.resetCheckout — olvida el checkout abierto.
 */
export function useProfessionalChoice(deps: {
  draftRef: RefObject<BookingDraft>;
  setDraft: Dispatch<SetStateAction<BookingDraft>>;
  resetCheckout: () => void;
}) {
  const { draftRef, setDraft, resetCheckout } = deps;

  /**
   * Cambia de profesional (`null` = «cualquiera»). Como con el hueco, un
   * checkout abierto deja de valer. La hora se conserva: si la nueva
   * agenda no la tiene, el SlotPicker avisa y se limpia con `clearSlot`.
   */
  const selectProfessional = useCallback(
    (professionalId: string | null) => {
      if (draftRef.current.professionalId === professionalId) return;
      setDraft((prev) => ({ ...prev, professionalId, bookingId: null }));
      resetCheckout();
    },
    [draftRef, setDraft, resetCheckout],
  );

  /** La hora elegida ya no está en la agenda consultada: se suelta. */
  const clearSlot = useCallback(() => {
    setDraft((prev) => ({ ...prev, slotStartIso: null, slotEndIso: null, bookingId: null }));
    resetCheckout();
  }, [setDraft, resetCheckout]);

  return { selectProfessional, clearSlot };
}

/**
 * Si el fallo actual significa «el profesional elegido ya no presta el
 * servicio»: entonces «elegir otra hora» vuelve también a «cualquiera».
 *
 * @param checkout — estado del checkout online.
 * @param onsite — estado de la reserva en el local.
 */
export function isProfessionalUnavailable(
  checkout: CheckoutState,
  onsite: OnsiteBookingState,
): boolean {
  if (checkout.status === 'error' && checkout.code === 'PROFESSIONAL_UNAVAILABLE') return true;
  return onsite.status === 'error' && onsite.error.code === 'PROFESSIONAL_UNAVAILABLE';
}

/**
 * Profesional que enseña la confirmación: el que quedó en la reserva
 * (el que asignó el servidor con «cualquiera»); si aún no se sabe, el
 * elegido en el borrador. `null` si no se puede resolver contra la lista
 * pública, y entonces la confirmación no pinta la fila.
 *
 * @param args.onsite — reserva en el local (si se hizo así).
 * @param args.checkout — checkout online (si se pagó así).
 * @param args.chosenId — profesional del borrador.
 * @param args.professionals — quienes prestan el servicio.
 */
export function resolveShownProfessional(args: {
  onsite: OnsiteBookingState;
  checkout: CheckoutState;
  chosenId: string | null;
  professionals: readonly PublicProfessional[];
}): PublicProfessional | null {
  const { onsite, checkout, chosenId, professionals } = args;
  const assignedId =
    onsite.status === 'done'
      ? onsite.booking.professionalId
      : checkout.status === 'ready'
        ? checkout.professionalId
        : null;
  const id = assignedId ?? chosenId;
  if (!id) return null;
  return professionals.find((professional) => professional.id === id) ?? null;
}
