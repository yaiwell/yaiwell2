/**
 * Tipos del diálogo «Bloquear horas» del calendario del panel.
 * Los del dominio (input de la action, códigos de error) viven en
 * `@/lib/services/schedule-blocks` y en la action de la ruta.
 */
import type { ScheduleBlockConflictView } from '@/app/[locale]/panel/calendario/schedule-blocks.actions';

import type { SupportedLocale } from '../BookingActionsList/BookingActionsList.types';

/** Props del botón + diálogo que se monta en la cabecera del calendario. */
export interface ScheduleBlockDialogProps {
  locale: SupportedLocale;
  /** Momento de referencia para los valores por defecto (inyectable en tests). */
  now?: Date;
}

/** Props del formulario: se monta de nuevo en cada apertura. */
export interface ScheduleBlockFormProps {
  locale: SupportedLocale;
  /** Momento en que se abrió el diálogo. */
  now: Date;
  onClose: () => void;
}

/** Valores del formulario: fechas `YYYY-MM-DD` y horas `HH:mm` de Madrid. */
export interface ScheduleBlockFormValues {
  startDateKey: string;
  startTime: string;
  endDateKey: string;
  endTime: string;
  reason: string;
}

/** Problemas que detectamos antes de enviar, sin ir al servidor. */
export type ScheduleBlockIssue = 'required' | 'step' | 'endBeforeStart';

/** Clave i18n de `scheduleBlocks.errors` para cada código del servidor. */
export type ScheduleBlockErrorKey =
  | 'invalidInput'
  | 'endBeforeStart'
  | 'inPast'
  | 'tooLong'
  | 'tooFar'
  | 'conflict'
  | 'notFound'
  | 'forbidden'
  | 'internal';

export type { ScheduleBlockConflictView };
