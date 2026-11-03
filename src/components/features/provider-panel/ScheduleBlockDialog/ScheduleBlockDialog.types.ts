/**
 * Tipos del diálogo «Bloquear horas» del calendario del panel.
 * Los del dominio (input de la action, códigos de error) viven en
 * `@/lib/services/schedule-blocks` y en la action de la ruta.
 */
import type { ScheduleBlockConflictView } from '@/app/[locale]/panel/calendario/schedule-blocks.actions';

import type { SupportedLocale } from '../BookingActionsList/BookingActionsList.types';
import type { PanelTeamMember } from '../WeeklyCalendar/WeeklyCalendar.types';

/** Props del botón + diálogo que se monta en la cabecera del calendario. */
export interface ScheduleBlockDialogProps {
  locale: SupportedLocale;
  /** Momento de referencia para los valores por defecto (inyectable en tests). */
  now?: Date;
  /**
   * Equipo activo. Con más de un profesional se pide a quién se bloquea
   * (o «Todo el equipo»); con uno, se envía el suyo sin preguntar.
   */
  team?: PanelTeamMember[];
  /** Profesional preseleccionado (el del filtro `?pro=` del calendario). */
  defaultProfessionalId?: string | null;
}

/** Props del formulario: se monta de nuevo en cada apertura. */
export interface ScheduleBlockFormProps {
  locale: SupportedLocale;
  /** Momento en que se abrió el diálogo. */
  now: Date;
  team: PanelTeamMember[];
  defaultProfessionalId: string | null;
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
export type ScheduleBlockIssue = 'required' | 'step' | 'endBeforeStart' | 'professional';

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
  | 'professionalRequired'
  | 'internal';

export type { PanelTeamMember, ScheduleBlockConflictView };
