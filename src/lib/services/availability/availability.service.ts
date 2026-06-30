import { computeAvailableSlots, getUtcDayBounds, isSlotFree } from './availability.calc';

/**
 * Zona horaria del negocio. España peninsular tiene una sola zona
 * (CET/CEST) y todos los providers actuales viven allí. Cuando el
 * marketplace cruce fronteras, se persistirá en `Provider.timezone`
 * y se pasará a `computeAvailableSlots` desde aquí. Mantenerla en
 * el service (no en el motor puro) permite que los tests del motor
 * sigan operando en UTC literal sin acoplarse a la decisión de país.
 */
const BUSINESS_TIMEZONE = 'Europe/Madrid';
import {
  InvalidScheduleError,
  ProfessionalNotFoundError,
  ServiceForAvailabilityNotFoundError,
} from './availability.errors';
import { availabilityRepository } from './availability.repository';
import { getAvailableSlotsSchema, weeklyScheduleSchema } from './availability.validation';
import type { Slot, WeeklySchedule } from './availability.types';

/**
 * Servicio de disponibilidad: orquesta el repositorio Prisma y el motor
 * de cálculo puro. Es el único punto de entrada para el resto de la app.
 */

/**
 * Carga el horario del profesional y lo parsea con Zod.
 *
 * Centralizamos esto en un helper porque tanto `getAvailableSlots` como
 * `isSlotAvailable` necesitan el horario y el buffer.
 *
 * @throws ProfessionalNotFoundError si no existe (o está soft-deleted).
 * @throws InvalidScheduleError si el JSON no encaja con `WeeklySchedule`.
 */
async function loadValidatedSchedule(
  professionalId: string,
): Promise<{ schedule: WeeklySchedule; bufferMinutes: number }> {
  const record = await availabilityRepository.findProfessionalSchedule(professionalId);
  if (!record) {
    throw new ProfessionalNotFoundError();
  }

  const parsed = weeklyScheduleSchema.safeParse(record.schedule);
  if (!parsed.success) {
    throw new InvalidScheduleError(
      'El horario del profesional no tiene un formato válido.',
      parsed.error.issues,
    );
  }

  return { schedule: parsed.data, bufferMinutes: record.bufferMinutes };
}

/**
 * Devuelve los slots disponibles de un profesional para un día concreto.
 *
 * Combina horario semanal, reservas activas (`pending`/`confirmed`),
 * `bufferMinutes` del profesional y duración del servicio para devolver
 * la lista final de slots libres, ordenados ascendentemente.
 *
 * Las fechas se manejan en UTC: el caller es responsable de convertir
 * a la zona horaria del centro si necesita renderizarlas.
 *
 * @throws ProfessionalNotFoundError, InvalidScheduleError.
 */
export async function getAvailableSlots(input: unknown): Promise<Slot[]> {
  // 1. Validamos input en el borde — defensa frente a callers ajenos.
  const data = getAvailableSlotsSchema.parse(input);

  // 2. Cargamos y validamos el horario del profesional.
  const { schedule, bufferMinutes } = await loadValidatedSchedule(data.professionalId);

  // 3. Acotamos la búsqueda de reservas al día UTC objetivo.
  const { dayStart, dayEnd } = getUtcDayBounds(data.date);
  const bookings = await availabilityRepository.findBookingsForDay(
    data.professionalId,
    dayStart,
    dayEnd,
  );

  // 4. Delegamos el cálculo en la función pura para mantener el service
  //    como simple orquestador. Pasamos la zona horaria del negocio para
  //    que los `HH:mm` del schedule se interpreten en Madrid (no UTC).
  return computeAvailableSlots({
    date: data.date,
    schedule,
    bufferMinutes,
    serviceDurationMinutes: data.serviceDurationMinutes,
    bookings,
    timezone: BUSINESS_TIMEZONE,
  });
}

/**
 * Comprueba si un slot concreto sigue libre para un profesional.
 *
 * Es la verificación que `booking.service.createBooking` ejecuta justo
 * antes de persistir la reserva. No revalida contra el horario semanal
 * (el caller ya escogió el slot desde la lista que ofrecimos): solo
 * comprueba que ninguna reserva activa lo haya ocupado en el ínterin.
 *
 * @throws ProfessionalNotFoundError si el profesional no existe.
 */
export async function isSlotAvailable(
  professionalId: string,
  slotStart: Date,
  durationMinutes: number,
): Promise<boolean> {
  // Aseguramos que el profesional existe; si no, hablar de "slot libre"
  // no tiene sentido y devolver `true` sería un falso positivo peligroso.
  const exists = await availabilityRepository.findProfessionalSchedule(professionalId);
  if (!exists) {
    throw new ProfessionalNotFoundError();
  }

  // Tomamos un margen de 24h alrededor del slot para cubrir reservas
  // que puedan cruzar el límite del día UTC.
  const dayStart = new Date(slotStart.getTime() - 24 * 60 * 60 * 1000);
  const dayEnd = new Date(slotStart.getTime() + durationMinutes * 60_000 + 24 * 60 * 60 * 1000);

  const bookings = await availabilityRepository.findBookingsForDay(
    professionalId,
    dayStart,
    dayEnd,
  );

  return isSlotFree(slotStart, durationMinutes, bookings);
}

/**
 * Devuelve los slots disponibles para un Service concreto en un día.
 *
 * Atajo público que la UI/API consumen para no tener que conocer el
 * grafo Service → Professional → Schedule:
 *  1. Resuelve el `Service` (excluyendo pausados/soft-deleted).
 *  2. Determina el `professionalId` efectivo: si el service lo tiene
 *     asignado, ese; si no (catálogo Fase 0 — todos los services del
 *     wizard se crean con `professionalId=null`), fallback al primer
 *     Professional del provider.
 *  3. Llama `getAvailableSlots` con la duración real del servicio.
 *
 * @throws ServiceForAvailabilityNotFoundError — si el service no existe,
 *   está pausado o el provider no tiene Professional al que ofrecer
 *   slots todavía.
 * @throws InvalidScheduleError, ProfessionalNotFoundError — propagados
 *   desde `getAvailableSlots`.
 */
export async function getSlotsForService(serviceId: string, date: Date): Promise<Slot[]> {
  const service = await availabilityRepository.findServiceForAvailability(serviceId);
  if (!service) {
    throw new ServiceForAvailabilityNotFoundError();
  }

  const professionalId =
    service.professionalId ??
    (await availabilityRepository.findFirstProfessionalIdForProvider(service.providerId));
  if (!professionalId) {
    // Provider sin Professional asociado (caso patológico que el wizard
    // no debería permitir). La UI lo tratará como "sin disponibilidad".
    throw new ServiceForAvailabilityNotFoundError(
      'El proveedor no tiene profesionales activos para este servicio.',
    );
  }

  return getAvailableSlots({
    professionalId,
    date,
    serviceDurationMinutes: service.durationMinutes,
  });
}
