import type { Weekday, WeeklySchedule } from '@/lib/services/availability';

export interface ScheduleEditorProps {
  /** Horario actual (controlado por el padre). */
  value: WeeklySchedule;
  /** Notifica cualquier cambio inmediato al padre. */
  onChange: (next: WeeklySchedule) => void;
  /** Bloquea inputs durante un submit en curso. */
  disabled?: boolean;
}

/**
 * Orden visual de los días en el editor. Lunes primero, domingo
 * último — convención ES/CA/EN (no la US donde empieza en domingo).
 */
export const WEEKDAY_ORDER: readonly Weekday[] = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
];

/** Tramo por defecto cuando el usuario abre un día cerrado. */
export const DEFAULT_BLOCK = { open: '09:00', close: '18:00' } as const;
