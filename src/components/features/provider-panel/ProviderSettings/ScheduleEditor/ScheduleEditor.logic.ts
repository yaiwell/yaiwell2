'use client';

import { useCallback } from 'react';

import type { Weekday, WeekdayBlock, WeeklySchedule } from '@/lib/services/availability';

import { DEFAULT_BLOCK } from './ScheduleEditor.types';

/**
 * Hook con los handlers que mutan el `WeeklySchedule` y notifican al
 * padre vía `onChange`. Mantiene el componente puramente presentacional.
 *
 * Diseño funcional: cada handler construye un nuevo `WeeklySchedule`
 * sin mutar el anterior, para preservar referencias inmutables que el
 * padre puede comparar en `useMemo`/`useTransition` sin sorpresas.
 */
export function useScheduleEditor(value: WeeklySchedule, onChange: (next: WeeklySchedule) => void) {
  /**
   * Alterna apertura/cierre de un día completo.
   *
   * - Día cerrado (sin tramos) → se abre con un único tramo default.
   * - Día abierto (>=1 tramo) → se cierra (lista vacía).
   */
  const toggleDay = useCallback(
    (day: Weekday) => {
      const current = value[day];
      const next: WeekdayBlock[] = current.length > 0 ? [] : [{ ...DEFAULT_BLOCK }];
      onChange({ ...value, [day]: next });
    },
    [value, onChange],
  );

  /** Añade un tramo adicional al final del día (jornadas partidas). */
  const addBlock = useCallback(
    (day: Weekday) => {
      onChange({ ...value, [day]: [...value[day], { ...DEFAULT_BLOCK }] });
    },
    [value, onChange],
  );

  /**
   * Quita un tramo de un día. Si era el último, el día queda cerrado
   * (lista vacía) — coherente con la convención del schema.
   */
  const removeBlock = useCallback(
    (day: Weekday, index: number) => {
      const next = value[day].filter((_, i) => i !== index);
      onChange({ ...value, [day]: next });
    },
    [value, onChange],
  );

  /**
   * Actualiza `open` o `close` de un tramo concreto. La validación de
   * `open < close` la hace el server al guardar (con `weeklyScheduleSchema`);
   * aquí no bloqueamos al usuario mientras escribe para no molestar.
   */
  const updateBlock = useCallback(
    (day: Weekday, index: number, patch: Partial<WeekdayBlock>) => {
      const next = value[day].map((block, i) => (i === index ? { ...block, ...patch } : block));
      onChange({ ...value, [day]: next });
    },
    [value, onChange],
  );

  return { toggleDay, addBlock, removeBlock, updateBlock };
}
