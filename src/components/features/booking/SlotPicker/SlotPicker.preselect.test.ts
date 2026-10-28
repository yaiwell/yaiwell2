import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { BookingSlot } from '@/lib/services/availability/availability.client';

import { findSlotByStart, getInitialDayForSlot, useSlotPreselection } from './SlotPicker.preselect';

/**
 * Tests de la preselección de hueco al llegar con `?slot=ISO` desde una
 * etiqueta de hueco liberado.
 */

/** 28 oct 2026, 09:00 en la zona local del entorno de test. */
const NOW = new Date(2026, 9, 28, 9, 0);

function slot(startAtIso: string, available = true): BookingSlot {
  return { startAtIso, endAtIso: startAtIso, available };
}

describe('getInitialDayForSlot', () => {
  it('abre el día local del hueco si cae en la ventana visible', () => {
    const iso = new Date(2026, 9, 30, 17, 0).toISOString();
    expect(getInitialDayForSlot(iso, NOW, 14)).toEqual(new Date(2026, 9, 30));
  });

  it('devuelve null sin hueco, con un ISO roto o fuera de la ventana', () => {
    expect(getInitialDayForSlot(null, NOW, 14)).toBeNull();
    expect(getInitialDayForSlot('basura', NOW, 14)).toBeNull();
    expect(getInitialDayForSlot(new Date(2026, 9, 27, 17).toISOString(), NOW, 14)).toBeNull();
    expect(getInitialDayForSlot(new Date(2026, 10, 20, 17).toISOString(), NOW, 14)).toBeNull();
  });
});

describe('findSlotByStart', () => {
  it('compara instantes, no strings', () => {
    const slots = [slot('2026-10-28T16:00:00.000Z')];
    expect(findSlotByStart(slots, '2026-10-28T16:00:00Z')).toBe(slots[0]);
    expect(findSlotByStart(slots, '2026-10-28T16:30:00Z')).toBeNull();
  });
});

interface PreselectionProps {
  initialSlotIso: string;
  slots: BookingSlot[];
  selectedStartIso: string | null;
  onSelect: (slot: BookingSlot) => void;
}

describe('useSlotPreselection', () => {
  const ISO = '2026-10-28T16:00:00.000Z';

  it('selecciona una sola vez el hueco pedido cuando aparece', () => {
    const onSelect = vi.fn();
    const initialProps: PreselectionProps = {
      initialSlotIso: ISO,
      slots: [],
      selectedStartIso: null,
      onSelect,
    };
    const { rerender } = renderHook((props: PreselectionProps) => useSlotPreselection(props), {
      initialProps,
    });
    expect(onSelect).not.toHaveBeenCalled();

    const slots = [slot(ISO)];
    rerender({ ...initialProps, slots });
    expect(onSelect).toHaveBeenCalledWith(slots[0]);

    rerender({ ...initialProps, slots: [...slots] });
    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  it('no pisa una elección previa (borrador recuperado)', () => {
    const onSelect = vi.fn();
    renderHook(() =>
      useSlotPreselection({
        initialSlotIso: ISO,
        slots: [slot(ISO)],
        selectedStartIso: '2026-10-28T18:00:00.000Z',
        onSelect,
      }),
    );
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('no selecciona un hueco que ya no está libre', () => {
    const onSelect = vi.fn();
    renderHook(() =>
      useSlotPreselection({
        initialSlotIso: ISO,
        slots: [slot(ISO, false)],
        selectedStartIso: null,
        onSelect,
      }),
    );
    expect(onSelect).not.toHaveBeenCalled();
  });
});
