/**
 * API pública del módulo `availability`.
 *
 * Cualquier consumidor (page, route handler, server action, otros
 * services) debe importar desde aquí. Importar archivos internos
 * directamente está prohibido por convención del proyecto.
 */
export { getAvailableSlots, isSlotAvailable } from './availability.service';
export { availabilityRepository } from './availability.repository';
export {
  computeAvailableSlots,
  getUtcDayBounds,
  getWeekdayKey,
  isSlotFree,
} from './availability.calc';
export { InvalidScheduleError, ProfessionalNotFoundError } from './availability.errors';
export {
  getAvailableSlotsSchema,
  weeklyScheduleSchema,
  type GetAvailableSlotsParsed,
} from './availability.validation';
export type {
  GetAvailableSlotsInput,
  Slot,
  Weekday,
  WeekdayBlock,
  WeekdaySchedule,
  WeeklySchedule,
} from './availability.types';
