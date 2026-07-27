/**
 * API pública del módulo `availability`.
 *
 * Cualquier consumidor (page, route handler, server action, otros
 * services) debe importar desde aquí. Importar archivos internos
 * directamente está prohibido por convención del proyecto.
 */
export { getAvailableSlots, getSlotsForService, isSlotAvailable } from './availability.service';
export { getProvidersAvailability } from './availability.status.service';
export { availabilityRepository } from './availability.repository';
export {
  AVAILABILITY_BUCKET_MINUTES,
  AVAILABLE_NOW_WINDOW_MINUTES,
  AVAILABLE_SOON_WINDOW_MINUTES,
  BUSINESS_TIMEZONE,
} from './availability.constants';
export {
  computeProviderAvailability,
  type ProviderAvailabilityMap,
} from './availability.status.calc';
export { floorToBucket, getCivilDayUtc, getCivilDaysInWindow } from './availability.time';
export {
  computeAvailableSlots,
  getUtcDayBounds,
  getWeekdayKey,
  isSlotFree,
} from './availability.calc';
export {
  InvalidScheduleError,
  ProfessionalNotFoundError,
  ServiceForAvailabilityNotFoundError,
} from './availability.errors';
export {
  getAvailableSlotsSchema,
  weeklyScheduleSchema,
  type GetAvailableSlotsParsed,
} from './availability.validation';
export type {
  GetAvailableSlotsInput,
  ProfessionalScheduleBundle,
  Slot,
  Weekday,
  WeekdayBlock,
  WeekdaySchedule,
  WeeklySchedule,
} from './availability.types';
