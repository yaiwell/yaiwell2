import { z } from 'zod';

/**
 * Schemas Zod para validar:
 *  - El input público de `getAvailableSlots` (borde HTTP/server action).
 *  - El JSON crudo de `Professional.schedule` antes de operar con él
 *    (defensa en profundidad: aunque la BD diga `Json`, no confiamos en
 *    su forma hasta haberla parseado).
 */

/**
 * Hora en formato `"HH:mm"` (24h, con cero a la izquierda).
 * Acepta de `00:00` a `23:59`.
 */
const timeStringSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/u, {
  message: 'Hora inválida; se espera formato HH:mm.',
});

/**
 * Bloque dentro de un día. Validamos también que `open < close` para
 * descartar pares incoherentes que romperían el motor de slots.
 */
const weekdayBlockSchema = z
  .object({
    open: timeStringSchema,
    close: timeStringSchema,
  })
  .refine((block) => block.open < block.close, {
    message: 'El bloque debe cumplir open < close.',
  });

/**
 * Lista de bloques de un día. Lista vacía = día cerrado.
 *
 * No forzamos que los bloques no se solapen entre sí: si el horario es
 * incoherente el motor lo aceptará pero los slots resultantes serán
 * subóptimos; preferimos ser tolerantes para no bloquear seeds antiguos.
 */
const weekdayScheduleSchema = z.array(weekdayBlockSchema);

/**
 * Horario semanal completo. Las 7 claves son obligatorias para evitar
 * accesos a `undefined` desde el motor de cálculo.
 */
export const weeklyScheduleSchema = z.object({
  monday: weekdayScheduleSchema,
  tuesday: weekdayScheduleSchema,
  wednesday: weekdayScheduleSchema,
  thursday: weekdayScheduleSchema,
  friday: weekdayScheduleSchema,
  saturday: weekdayScheduleSchema,
  sunday: weekdayScheduleSchema,
});

/**
 * Input público de `getAvailableSlots`.
 *
 * - `serviceDurationMinutes` mínimo 1 para evitar bucles infinitos en el
 *   troceado.
 * - `date` se coerce desde string para que la entrada desde URL o JSON
 *   API funcione sin transformaciones extra en el caller.
 */
export const getAvailableSlotsSchema = z.object({
  professionalId: z.string().uuid(),
  date: z.coerce.date(),
  serviceDurationMinutes: z
    .number()
    .int()
    .positive()
    .max(24 * 60),
});

export type GetAvailableSlotsParsed = z.infer<typeof getAvailableSlotsSchema>;

/**
 * Input de `getProvidersAvailability` (ruta batch del listado público).
 *
 * A diferencia de `getAvailableSlotsSchema`, aquí NO exigimos formato
 * uuid en los ids. Es deliberado: esta función alimenta el listado
 * entero, y un id con forma inesperada (catálogo heredado, dato sucio)
 * debe degradar ese proveedor a `busy`, nunca tumbar la página con una
 * excepción de validación.
 *
 * El tope de 1000 es una red de seguridad frente a un caller que pase
 * el catálogo completo sin filtrar; hoy `/buscar` no llega ni de lejos.
 */
export const getProvidersAvailabilitySchema = z.object({
  providerIds: z.array(z.string().min(1)).max(1000),
});

export type GetProvidersAvailabilityParsed = z.infer<typeof getProvidersAvailabilitySchema>;
