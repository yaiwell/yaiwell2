/**
 * Validación de entrada de los bloqueos de agenda.
 *
 * Solo forma: formato de fecha y hora, rejilla de 5 minutos y motivo.
 * Las reglas que dependen del reloj (pasado, máximo, un año vista) las
 * aplica el servicio, que conoce `now`.
 */
import { z } from 'zod';

import {
  SCHEDULE_BLOCK_REASON_MAX_LENGTH,
  SCHEDULE_BLOCK_STEP_MINUTES,
} from './schedule-blocks.constants';

/** Día civil real: descarta `2026-02-31` comparando ida y vuelta. */
const dateKeySchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((key) => {
    const marker = new Date(`${key}T00:00:00.000Z`);
    return !Number.isNaN(marker.getTime()) && marker.toISOString().slice(0, 10) === key;
  });

/** ¿Cae `HH:mm` en la rejilla de 5 minutos? */
function isOnStep(hhmm: string): boolean {
  return Number(hhmm.slice(3, 5)) % SCHEDULE_BLOCK_STEP_MINUTES === 0;
}

const startTimeSchema = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/)
  .refine(isOnStep);

// El fin admite `24:00` para que «hasta el final del día» no obligue a
// elegir las 00:00 del día siguiente.
const endTimeSchema = z
  .string()
  .regex(/^(([01]\d|2[0-3]):[0-5]\d|24:00)$/)
  .refine(isOnStep);

/**
 * Motivo opcional. Recortamos espacios y tratamos el vacío como «sin
 * motivo» para no guardar cadenas en blanco.
 */
const reasonSchema = z
  .string()
  .trim()
  .max(SCHEDULE_BLOCK_REASON_MAX_LENGTH)
  .optional()
  .transform((value) => (value ? value : undefined));

/** Entrada de `createScheduleBlock`, en hora de pared de Madrid. */
export const createScheduleBlockSchema = z.strictObject({
  startDateKey: dateKeySchema,
  startTime: startTimeSchema,
  endDateKey: dateKeySchema,
  endTime: endTimeSchema,
  reason: reasonSchema,
});

export type CreateScheduleBlockParsed = z.infer<typeof createScheduleBlockSchema>;

/** Id de bloqueo: texto (los ids de Prisma son `text`, no `uuid`). */
export const scheduleBlockIdSchema = z.string().trim().min(1).max(64);
