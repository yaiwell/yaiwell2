import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { BookingSlot } from '@/lib/services/availability/availability.client';

import {
  findSlotByStart,
  getInitialDayForSlot,
  resolvePreselection,
  useSlotPreselection,
} from './SlotPicker.preselect';

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
  targetDayKey: string | null;
  viewedDayKey: string;
  isLoaded: boolean;
}

/** Día del hueco de prueba y día visto por defecto en los tests del hook. */
const DAY = { targetDayKey: '2026-10-28', viewedDayKey: '2026-10-28' };

describe('resolvePreselection', () => {
  const ISO = '2026-10-28T16:00:00.000Z';
  const base = { initialSlotIso: ISO, ...DAY, isLoaded: true };

  it('sin hueco pedido no hay nada que decidir', () => {
    expect(resolvePreselection({ ...base, initialSlotIso: null, slots: [] })).toEqual({
      status: 'none',
    });
  });

  it('da el hueco por perdido si su día queda fuera de los visibles', () => {
    expect(resolvePreselection({ ...base, targetDayKey: null, slots: [] }).status).toBe('gone');
  });

  it('espera mientras carga o si el usuario mira otro día', () => {
    expect(resolvePreselection({ ...base, isLoaded: false, slots: [] }).status).toBe('waiting');
    expect(resolvePreselection({ ...base, viewedDayKey: '2026-10-29', slots: [] }).status).toBe(
      'waiting',
    );
  });

  it('encuentra el hueco libre o lo da por perdido si ya no está', () => {
    const slots = [slot(ISO)];
    expect(resolvePreselection({ ...base, slots })).toEqual({ status: 'found', slot: slots[0] });
    expect(resolvePreselection({ ...base, slots: [] }).status).toBe('gone');
    expect(resolvePreselection({ ...base, slots: [slot(ISO, false)] }).status).toBe('gone');
  });
});

describe('useSlotPreselection', () => {
  const ISO = '2026-10-28T16:00:00.000Z';

  it('selecciona una sola vez el hueco pedido cuando aparece', () => {
    const onSelect = vi.fn();
    const initialProps: PreselectionProps = {
      initialSlotIso: ISO,
      slots: [],
      selectedStartIso: null,
      onSelect,
      ...DAY,
      isLoaded: false,
    };
    const { rerender } = renderHook((props: PreselectionProps) => useSlotPreselection(props), {
      initialProps,
    });
    expect(onSelect).not.toHaveBeenCalled();

    const slots = [slot(ISO)];
    rerender({ ...initialProps, slots, isLoaded: true });
    expect(onSelect).toHaveBeenCalledWith(slots[0]);

    rerender({ ...initialProps, slots: [...slots], isLoaded: true });
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
        ...DAY,
        isLoaded: true,
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
        ...DAY,
        isLoaded: true,
      }),
    );
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('avisa una vez si el hueco ya no está y calla al elegir otra hora', () => {
    const onSelect = vi.fn();
    const initialProps: PreselectionProps = {
      initialSlotIso: ISO,
      slots: [],
      selectedStartIso: null,
      onSelect,
      ...DAY,
      isLoaded: false,
    };
    const { result, rerender } = renderHook(
      (props: PreselectionProps) => useSlotPreselection(props),
      { initialProps },
    );
    // Cargando: aún no sabemos nada.
    expect(result.current.slotGone).toBe(false);

    const other = slot('2026-10-28T18:00:00.000Z');
    rerender({ ...initialProps, slots: [other], isLoaded: true });
    expect(result.current.slotGone).toBe(true);
    expect(onSelect).not.toHaveBeenCalled();

    // Cambiar de día no borra el aviso: se decidió una vez.
    rerender({ ...initialProps, viewedDayKey: '2026-10-29', isLoaded: false });
    expect(result.current.slotGone).toBe(true);

    // En cuanto el usuario elige, desaparece.
    rerender({ ...initialProps, selectedStartIso: other.startAtIso, isLoaded: true });
    expect(result.current.slotGone).toBe(false);
  });

  it('avisa sin esperar si el día del hueco queda fuera de la tira', () => {
    const { result } = renderHook(() =>
      useSlotPreselection({
        initialSlotIso: ISO,
        slots: [],
        selectedStartIso: null,
        onSelect: vi.fn(),
        targetDayKey: null,
        viewedDayKey: '2026-10-28',
        isLoaded: false,
      }),
    );
    expect(result.current.slotGone).toBe(true);
  });

  it('no avisa si el hueco se preseleccionó', () => {
    const onSelect = vi.fn();
    const { result } = renderHook(() =>
      useSlotPreselection({
        initialSlotIso: ISO,
        slots: [slot(ISO)],
        selectedStartIso: null,
        onSelect,
        ...DAY,
        isLoaded: true,
      }),
    );
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(result.current.slotGone).toBe(false);
  });

  it('no avisa con un borrador recuperado aunque el hueco ya no esté', () => {
    const { result } = renderHook(() =>
      useSlotPreselection({
        initialSlotIso: ISO,
        slots: [],
        selectedStartIso: '2026-10-28T18:00:00.000Z',
        onSelect: vi.fn(),
        ...DAY,
        isLoaded: true,
      }),
    );
    expect(result.current.slotGone).toBe(false);
  });
});
