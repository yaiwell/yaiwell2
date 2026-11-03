import { getEarliestBookableStart } from '@/lib/utils/booking-lead-time';

import { computeAvailableSlots, getUtcDayBounds, isSlotFree } from './availability.calc';
import { BUSINESS_TIMEZONE, BUSY_MARGIN_MS } from './availability.constants';
import { InvalidScheduleError, AvailabilityProfessionalNotFoundError } from './availability.errors';
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
 * @throws AvailabilityProfessionalNotFoundError si no existe (o está soft-deleted).
 * @throws InvalidScheduleError si el JSON no encaja con `WeeklySchedule`.
 */
async function loadValidatedSchedule(
  professionalId: string,
): Promise<{ schedule: WeeklySchedule; bufferMinutes: number }> {
  const record = await availabilityRepository.findProfessionalSchedule(professionalId);
  if (!record) {
    throw new AvailabilityProfessionalNotFoundError();
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
 * bloqueos de agenda activos,
 * `bufferMinutes` del profesional y duración del servicio para devolver
 * la lista final de slots libres, ordenados ascendentemente.
 *
 * Solo devuelve huecos **reservables**: descarta los que empiezan antes
 * de `now + MIN_BOOKING_LEAD_TIME_MS` (30 min). Es la misma constante
 * que aplica `createBookingSchema`, así que el selector nunca ofrece una
 * hora que el servidor rechazaría al reservar (bug histórico: con la
 * antelación solo en la validación, el selector enseñaba horas a 1 h
 * vista que luego no se podían comprar).
 *
 * Las fechas se manejan en UTC: el caller es responsable de convertir
 * a la zona horaria del centro si necesita renderizarlas.
 *
 * @param input — `{ professionalId, date, serviceDurationMinutes }`, validado con Zod.
 * @param now — instante de referencia para la antelación mínima;
 *   inyectable para tests.
 * @throws AvailabilityProfessionalNotFoundError, InvalidScheduleError.
 */
export async function getAvailableSlots(input: unknown, now: Date = new Date()): Promise<Slot[]> {
  // 1. Validamos input en el borde — defensa frente a callers ajenos.
  const data = getAvailableSlotsSchema.parse(input);

  // 2. Cargamos y validamos el horario del profesional.
  const { schedule, bufferMinutes } = await loadValidatedSchedule(data.professionalId);

  // 3. Reservas y bloqueos se piden con margen alrededor del día UTC: la
  //    madrugada de Madrid (00:00-02:00) cae en UTC el día anterior, y
  //    cortando en el día UTC una reserva a la 01:00 no se veía y su hora
  //    se ofrecía como libre. Un tramo de más no ocupa ningún hueco del
  //    día, así que el margen es inocuo.
  const { dayStart, dayEnd } = getUtcDayBounds(data.date);
  const from = new Date(dayStart.getTime() - BUSY_MARGIN_MS);
  const to = new Date(dayEnd.getTime() + BUSY_MARGIN_MS);
  const [bookings, blocks] = await Promise.all([
    availabilityRepository.findBookingsForDay(data.professionalId, from, to),
    availabilityRepository.findScheduleBlocksForRange(data.professionalId, from, to),
  ]);

  // 4. Delegamos el cálculo en la función pura para mantener el service
  //    como simple orquestador. Pasamos la zona horaria del negocio para
  //    que los `HH:mm` del schedule se interpreten en Madrid (no UTC).
  const slots = computeAvailableSlots({
    date: data.date,
    schedule,
    bufferMinutes,
    serviceDurationMinutes: data.serviceDurationMinutes,
    // Un bloqueo ocupa igual que una reserva: el motor puro no los distingue.
    bookings: [...bookings, ...blocks],
    timezone: BUSINESS_TIMEZONE,
  });

  // 5. Quitamos lo que ya no se puede reservar. El motor puro devuelve
  //    el día entero (incluido lo pasado) a propósito: el corte depende
  //    de `now`, que es una regla de negocio y no de cálculo de agenda.
  const earliestMs = getEarliestBookableStart(now).getTime();
  return slots.filter((slot) => slot.startAt.getTime() >= earliestMs);
}

/**
 * Comprueba si un slot concreto sigue libre para un profesional.
 *
 * Es la verificación que `booking.service.createBooking` ejecuta justo
 * antes de persistir la reserva. No revalida contra el horario semanal
 * (el caller ya escogió el slot desde la lista que ofrecimos): solo
 * comprueba que ninguna reserva activa ni bloqueo de agenda lo haya
 * ocupado en el ínterin.
 *
 * @throws AvailabilityProfessionalNotFoundError si el profesional no existe.
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
    throw new AvailabilityProfessionalNotFoundError();
  }

  // Tomamos un margen de 24h alrededor del slot para cubrir reservas
  // que puedan cruzar el límite del día UTC.
  const dayStart = new Date(slotStart.getTime() - 24 * 60 * 60 * 1000);
  const dayEnd = new Date(slotStart.getTime() + durationMinutes * 60_000 + 24 * 60 * 60 * 1000);

  const [bookings, blocks] = await Promise.all([
    availabilityRepository.findBookingsForDay(professionalId, dayStart, dayEnd),
    availabilityRepository.findScheduleBlocksForRange(professionalId, dayStart, dayEnd),
  ]);

  return isSlotFree(slotStart, durationMinutes, [...bookings, ...blocks]);
}
