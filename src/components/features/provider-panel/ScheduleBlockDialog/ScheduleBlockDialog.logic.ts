'use client';

import { useState, useTransition } from 'react';

import {
  createScheduleBlockAction,
  type ScheduleBlockConflictView,
} from '@/app/[locale]/panel/calendario/schedule-blocks.actions';
import { useRouter } from '@/i18n/navigation';
import {
  SCHEDULE_BLOCK_REASON_MAX_LENGTH,
  SCHEDULE_BLOCK_STEP_MINUTES,
} from '@/lib/services/schedule-blocks/schedule-blocks.constants';
import type {
  CreateScheduleBlockInput,
  ScheduleBlockErrorCode,
} from '@/lib/services/schedule-blocks/schedule-blocks.types';
import { PANEL_TIMEZONE, addDaysToDateKey, getMadridDateKey } from '@/lib/utils/madrid-week';

import type { SupportedLocale } from '../BookingActionsList/BookingActionsList.types';
import type {
  ScheduleBlockErrorKey,
  ScheduleBlockFormValues,
  ScheduleBlockIssue,
} from './ScheduleBlockDialog.types';

/**
 * Largo máximo del motivo privado. Constante del dominio (archivo sin
 * servidor, importado por ruta directa): el cliente y el servidor nunca
 * discrepan.
 */
export const SCHEDULE_BLOCK_REASON_MAX = SCHEDULE_BLOCK_REASON_MAX_LENGTH;

/** `step` de los `<input type="time">`: el navegador lo quiere en segundos. */
export const TIME_INPUT_STEP_SECONDS = SCHEDULE_BLOCK_STEP_MINUTES * 60;

const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const ERROR_KEYS: Record<ScheduleBlockErrorCode, ScheduleBlockErrorKey> = {
  INVALID_INPUT: 'invalidInput',
  END_BEFORE_START: 'endBeforeStart',
  IN_PAST: 'inPast',
  TOO_LONG: 'tooLong',
  TOO_FAR: 'tooFar',
  CONFLICT: 'conflict',
  NOT_FOUND: 'notFound',
  FORBIDDEN: 'forbidden',
  INTERNAL: 'internal',
};

/** Código opaco de la action → clave i18n del mensaje. */
export function toScheduleBlockErrorKey(code: ScheduleBlockErrorCode): ScheduleBlockErrorKey {
  return ERROR_KEYS[code] ?? 'internal';
}

/** Hora (0-23) de `instant` en Madrid, sin depender de la zona del navegador. */
function getMadridHour(instant: Date): number {
  const hour = new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit',
    hourCycle: 'h23',
    timeZone: PANEL_TIMEZONE,
  }).format(instant);
  return Number.parseInt(hour, 10);
}

/** Hora entera `h` (puede pasar de 23) a partir de `dateKey`, como fecha + `HH:00`. */
function toWallClock(dateKey: string, hour: number): { dateKey: string; time: string } {
  const extraDays = Math.floor(hour / 24);
  const h = hour % 24;
  return {
    dateKey: addDaysToDateKey(dateKey, extraDays),
    time: `${String(h).padStart(2, '0')}:00`,
  };
}

/**
 * Valores por defecto: hoy, de la próxima hora en punto a una hora más,
 * en hora de Madrid (la del negocio, aunque el móvil esté en otra zona).
 * A las 23:20 propone de 00:00 a 01:00 del día siguiente.
 */
export function getDefaultValues(now: Date): ScheduleBlockFormValues {
  const today = getMadridDateKey(now);
  const nextHour = getMadridHour(now) + 1;
  const start = toWallClock(today, nextHour);
  const end = toWallClock(today, nextHour + 1);
  return {
    startDateKey: start.dateKey,
    startTime: start.time,
    endDateKey: end.dateKey,
    endTime: end.time,
    reason: '',
  };
}

/** ¿La hora `HH:mm` cae en un múltiplo de 5 minutos? */
function isOnStep(time: string): boolean {
  const minutes = Number.parseInt(time.slice(3, 5), 10);
  return minutes % SCHEDULE_BLOCK_STEP_MINUTES === 0;
}

/**
 * Problema del formulario que se puede explicar sin ir al servidor, o
 * `null`. Pasado, duración máxima y antelación los decide el servidor
 * (depende de su reloj, no del del móvil).
 *
 * Comparar `fecha + T + hora` como texto es seguro: ambos lados tienen
 * el mismo formato de ancho fijo.
 */
export function getFormIssue(values: ScheduleBlockFormValues): ScheduleBlockIssue | null {
  const { startDateKey, startTime, endDateKey, endTime } = values;
  const dates = [startDateKey, endDateKey];
  const times = [startTime, endTime];
  if (!dates.every((d) => DATE_PATTERN.test(d)) || !times.every((t) => TIME_PATTERN.test(t))) {
    return 'required';
  }
  if (!times.every(isOnStep)) return 'step';
  if (`${endDateKey}T${endTime}` <= `${startDateKey}T${startTime}`) return 'endBeforeStart';
  return null;
}

/** Entrada de la action: el motivo vacío no viaja. */
export function toCreateInput(values: ScheduleBlockFormValues): CreateScheduleBlockInput {
  const reason = values.reason.trim();
  return {
    startDateKey: values.startDateKey,
    startTime: values.startTime,
    endDateKey: values.endDateKey,
    endTime: values.endTime,
    ...(reason ? { reason } : {}),
  };
}

/**
 * Estado del formulario «Bloquear horas»: valores, validación en vivo,
 * envío y respuesta del servidor (incluida la lista de citas que chocan).
 */
export function useScheduleBlockForm(locale: SupportedLocale, now: Date) {
  const router = useRouter();
  const [values, setValues] = useState<ScheduleBlockFormValues>(() => getDefaultValues(now));
  const [errorKey, setErrorKey] = useState<ScheduleBlockErrorKey | null>(null);
  const [conflicts, setConflicts] = useState<ScheduleBlockConflictView[]>([]);
  const [done, setDone] = useState(false);
  const [isPending, startTransition] = useTransition();
  const issue = getFormIssue(values);

  function setField<K extends keyof ScheduleBlockFormValues>(field: K, value: string) {
    setValues((prev) => ({ ...prev, [field]: value }));
    // Al tocar el rango, el error del servidor ya no describe lo que hay.
    setErrorKey(null);
    setConflicts([]);
  }

  function submit() {
    if (issue) return;
    setErrorKey(null);
    setConflicts([]);
    startTransition(async () => {
      const result = await createScheduleBlockAction(locale, toCreateInput(values));
      if (result.ok) {
        setDone(true);
        router.refresh();
        return;
      }
      setErrorKey(toScheduleBlockErrorKey(result.code));
      setConflicts(result.code === 'CONFLICT' ? (result.conflicts ?? []) : []);
    });
  }

  return { values, setField, issue, errorKey, conflicts, done, isPending, submit };
}

/**
 * Apertura del diálogo: cada vez que se abre se fija el «ahora» de los
 * valores por defecto y una `key` nueva para que el formulario arranque
 * limpio (sin el error ni los datos de la vez anterior).
 */
export function useScheduleBlockDialog(fixedNow?: Date) {
  const [open, setOpen] = useState(false);
  const [openedAt, setOpenedAt] = useState<Date>(() => fixedNow ?? new Date());
  const [formKey, setFormKey] = useState(0);

  function handleOpenChange(next: boolean) {
    if (next) {
      setOpenedAt(fixedNow ?? new Date());
      setFormKey((k) => k + 1);
    }
    setOpen(next);
  }

  return { open, openedAt, formKey, handleOpenChange, close: () => handleOpenChange(false) };
}
