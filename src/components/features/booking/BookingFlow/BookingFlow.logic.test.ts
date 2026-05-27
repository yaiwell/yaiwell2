import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { BOOKING_STEPS, useBookingFlow } from './BookingFlow.logic';

/**
 * Tests del hook `useBookingFlow`.
 *
 * Verificamos la transición entre pasos, la captura del slot en el draft
 * y el desbloqueo del flujo para que no se pueda avanzar desde "slot"
 * sin haber seleccionado uno (es la única regla dura del flujo mock).
 */
describe('useBookingFlow', () => {
  it('arranca en el paso "slot" con draft vacío y sin avance disponible', () => {
    const { result } = renderHook(() => useBookingFlow());

    expect(result.current.step).toBe('slot');
    expect(result.current.stepIndex).toBe(0);
    expect(result.current.draft.slotStartIso).toBeNull();
    expect(result.current.draft.bookingId).toBeNull();
    expect(result.current.canAdvance).toBe(false);
  });

  it('habilita el avance solo cuando se selecciona un slot', () => {
    const { result } = renderHook(() => useBookingFlow());

    act(() => {
      result.current.selectSlot('2026-05-30T10:00:00.000Z', '2026-05-30T11:00:00.000Z');
    });

    expect(result.current.draft.slotStartIso).toBe('2026-05-30T10:00:00.000Z');
    expect(result.current.draft.slotEndIso).toBe('2026-05-30T11:00:00.000Z');
    expect(result.current.canAdvance).toBe(true);
  });

  it('avanza y retrocede entre pasos respetando los límites del flujo', () => {
    const { result } = renderHook(() => useBookingFlow());

    act(() => {
      result.current.selectSlot('2026-05-30T10:00:00.000Z', '2026-05-30T11:00:00.000Z');
    });
    act(() => {
      result.current.goNext();
    });

    expect(result.current.step).toBe('summary');

    act(() => {
      result.current.goNext();
    });

    expect(result.current.step).toBe('payment');

    act(() => {
      result.current.goBack();
    });

    expect(result.current.step).toBe('summary');
  });

  it('no retrocede más allá del primer paso', () => {
    const { result } = renderHook(() => useBookingFlow());

    // Doble goBack desde el paso inicial debería ser idempotente.
    act(() => {
      result.current.goBack();
      result.current.goBack();
    });

    expect(result.current.step).toBe('slot');
  });

  it('completeMockPayment genera un bookingId y salta a la confirmación', () => {
    const { result } = renderHook(() => useBookingFlow());

    act(() => {
      result.current.completeMockPayment();
    });

    expect(result.current.step).toBe('confirmation');
    expect(result.current.draft.bookingId).not.toBeNull();
    // El id debe seguir el prefijo `bk-mock-` para distinguir reservas
    // de demo de futuras reservas reales y facilitar filtrado en QA.
    expect(result.current.draft.bookingId).toMatch(/^bk-mock-/);
  });

  it('updateDraft permite escribir notas sin tocar el resto del draft', () => {
    const { result } = renderHook(() => useBookingFlow());

    act(() => {
      result.current.selectSlot('2026-05-30T10:00:00.000Z', '2026-05-30T11:00:00.000Z');
      result.current.updateDraft({ notes: 'Vengo 5 minutos antes' });
    });

    expect(result.current.draft.notes).toBe('Vengo 5 minutos antes');
    expect(result.current.draft.slotStartIso).toBe('2026-05-30T10:00:00.000Z');
  });

  it('expone los pasos en el orden esperado del flujo', () => {
    // Regresión: si alguien reordena BOOKING_STEPS se rompe el indicador
    // visual del stepper y la lógica `goNext`/`goBack`.
    expect(BOOKING_STEPS).toEqual(['slot', 'summary', 'payment', 'confirmation']);
  });
});
