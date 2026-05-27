'use client';

import { useCallback, useMemo, useState } from 'react';

import type { BookingDraft, BookingStep } from './BookingFlow.types';

/**
 * Orden de los pasos del flujo. Se centraliza aquí para que el componente
 * y el indicador visual compartan la misma fuente de verdad y no sea
 * posible "desincronizarse" al añadir o reordenar pasos en el futuro.
 */
export const BOOKING_STEPS: readonly BookingStep[] = [
  'slot',
  'summary',
  'payment',
  'confirmation',
] as const;

/**
 * Hook que gestiona el estado del flujo de reserva mock.
 *
 * Encapsula:
 *  - Paso activo y navegación adelante/atrás.
 *  - Draft con la información acumulada (slot, notas, id ficticio).
 *  - Helpers para determinar si se puede avanzar desde un paso dado.
 *
 * Está aislado del componente JSX para mantener la regla del proyecto
 * (`§6.bis`) y para poder testear la lógica sin renderizar UI.
 */
export function useBookingFlow() {
  const [step, setStep] = useState<BookingStep>('slot');
  const [draft, setDraft] = useState<BookingDraft>({
    slotStartIso: null,
    slotEndIso: null,
    notes: '',
    bookingId: null,
  });

  const stepIndex = useMemo(() => BOOKING_STEPS.indexOf(step), [step]);

  const goToStep = useCallback((next: BookingStep) => {
    setStep(next);
  }, []);

  const goNext = useCallback(() => {
    setStep((current) => {
      const idx = BOOKING_STEPS.indexOf(current);
      // Si ya estamos en el último paso, no movemos. Evita estados inválidos.
      if (idx < 0 || idx >= BOOKING_STEPS.length - 1) return current;
      return BOOKING_STEPS[idx + 1];
    });
  }, []);

  const goBack = useCallback(() => {
    setStep((current) => {
      const idx = BOOKING_STEPS.indexOf(current);
      if (idx <= 0) return current;
      return BOOKING_STEPS[idx - 1];
    });
  }, []);

  const updateDraft = useCallback((patch: Partial<BookingDraft>) => {
    setDraft((prev) => ({ ...prev, ...patch }));
  }, []);

  const selectSlot = useCallback((startAtIso: string, endAtIso: string) => {
    setDraft((prev) => ({ ...prev, slotStartIso: startAtIso, slotEndIso: endAtIso }));
  }, []);

  /**
   * Genera un id ficticio de reserva al cerrar el "pago" mock. Lo hacemos
   * en cliente porque no hay BD real; se usa solo para la pantalla de
   * confirmación. En producción este id vendrá de la API tras el webhook
   * de Stripe.
   */
  const completeMockPayment = useCallback(() => {
    const id = `bk-mock-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    setDraft((prev) => ({ ...prev, bookingId: id }));
    setStep('confirmation');
  }, []);

  const canAdvance = useMemo<boolean>(() => {
    if (step === 'slot') return draft.slotStartIso !== null;
    return true;
  }, [step, draft.slotStartIso]);

  return {
    step,
    stepIndex,
    draft,
    canAdvance,
    goToStep,
    goNext,
    goBack,
    updateDraft,
    selectSlot,
    completeMockPayment,
  };
}
