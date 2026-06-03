/**
 * Tipos del dominio `availability`.
 *
 * Modelo de horario:
 *  - Un `WeeklySchedule` mapea cada día de la semana a una lista de
 *    bloques (`WeekdaySchedule[]`). Lista vacía = día cerrado.
 *  - Cada bloque es un par `open`/`close` en formato `"HH:mm"` (24h)
 *    interpretado como UTC sobre la fecha objetivo. La conversión a la
 *    zona horaria local del centro es responsabilidad de capas superiores
 *    cuando llegue el momento; en MVP asumimos UTC para mantener la
 *    aritmética simple y reproducible.
 *  - Soportar múltiples bloques permite jornadas partidas
 *    (ej. `10:00-14:00` + `17:00-20:00`).
 */

/**
 * Slot de disponibilidad: instante de inicio y fin en UTC.
 *
 * Es el formato que consumirá el `BookingFlow` y el `booking.service`
 * para crear la reserva.
 */
export interface Slot {
  startAt: Date;
  endAt: Date;
}

/**
 * Bloque de apertura dentro de un día. Las horas son `"HH:mm"` en 24h.
 */
export interface WeekdayBlock {
  open: string;
  close: string;
}

/**
 * Lista de bloques de un día. Vacía => el profesional no trabaja ese día.
 */
export type WeekdaySchedule = WeekdayBlock[];

/**
 * Horario semanal completo, con clave por día.
 *
 * Las claves siguen los nombres ingleses en minúscula porque coinciden
 * con cómo se serializan en el JSON guardado en `Professional.schedule`
 * (ver `prisma/schema.prisma`).
 */
export interface WeeklySchedule {
  monday: WeekdaySchedule;
  tuesday: WeekdaySchedule;
  wednesday: WeekdaySchedule;
  thursday: WeekdaySchedule;
  friday: WeekdaySchedule;
  saturday: WeekdaySchedule;
  sunday: WeekdaySchedule;
}

/**
 * Día de la semana en formato textual (clave de `WeeklySchedule`).
 *
 * Útil para indexar el horario por el `getUTCDay()` de la fecha
 * solicitada sin acoplar el orden a un número mágico.
 */
export type Weekday = keyof WeeklySchedule;

/**
 * Entrada pública de `getAvailableSlots`.
 */
export interface GetAvailableSlotsInput {
  professionalId: string;
  date: Date;
  serviceDurationMinutes: number;
}
