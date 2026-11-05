import { getEarliestBookableStart } from '@/lib/utils/booking-lead-time';

import { computeAvailableSlots, getUtcDayBounds } from './availability.calc';
import { BUSINESS_TIMEZONE, BUSY_MARGIN_MS } from './availability.constants';
import {
  InvalidScheduleError,
  ProfessionalNotForServiceError,
  ServiceForAvailabilityNotFoundError,
} from './availability.errors';
import { availabilityRepository } from './availability.repository';
import type { ServiceDaySlots, Slot } from './availability.types';
import { weeklyScheduleSchema } from './availability.validation';

/**
 * Rejilla de un servicio en un día con varios profesionales (CLAUDE.md
 * §4.bis «Equipo»). Cada profesional asignado al servicio tiene su
 * horario, sus reservas y sus bloqueos; la rejilla pública es la UNIÓN
 * por hora de inicio («cualquiera disponible»), y para cada hora se
 * guardan los profesionales libres para que la reserva elija entre ellos.
 */

type Busy = { startAt: Date; endAt: Date };

/** Agrupa tramos ocupados (reservas y bloqueos) por profesional. */
export function groupBusy(
  rows: readonly (Busy & { professionalId: string })[],
): Map<string, Busy[]> {
  const map = new Map<string, Busy[]>();
  for (const row of rows) {
    const list = map.get(row.professionalId) ?? [];
    list.push({ startAt: row.startAt, endAt: row.endAt });
    map.set(row.professionalId, list);
  }
  return map;
}

/**
 * Devuelve los huecos de un servicio en un día.
 *
 * Sin `professionalId` («cualquiera»): calcula la rejilla de cada
 * profesional asignado y activo y devuelve la unión por `startAt`. Con
 * `professionalId`: solo la de ese profesional, tras comprobar que
 * presta el servicio.
 *
 * Carga en lote (una consulta para horarios, otra para reservas y otra
 * para bloqueos, por `providerId`): no hay N+1 por profesional.
 *
 * Solo devuelve huecos reservables (antelación mínima de 30 min, la
 * misma que aplica `createBookingSchema`).
 *
 * Horario corrupto: con `professionalId` se lanza `InvalidScheduleError`
 * (como antes); en «cualquiera» ese profesional se omite y se registra,
 * salvo que todos estén rotos, en cuyo caso se lanza igualmente.
 *
 * @param serviceId — servicio a reservar.
 * @param date — medianoche UTC del día civil de Madrid.
 * @param now — instante de referencia para la antelación; inyectable.
 * @param professionalId — profesional concreto, u omitido para «cualquiera».
 * @throws ServiceForAvailabilityNotFoundError — servicio inexistente,
 *   pausado o sin profesionales activos asignados.
 * @throws ProfessionalNotForServiceError — `professionalId` no lo presta.
 * @throws InvalidScheduleError — ver arriba.
 */
export async function getServiceDaySlots(
  serviceId: string,
  date: Date,
  now: Date = new Date(),
  professionalId?: string,
): Promise<ServiceDaySlots> {
  const service = await availabilityRepository.findServiceForAvailability(serviceId);
  if (!service) {
    throw new ServiceForAvailabilityNotFoundError();
  }
  if (service.professionalIds.length === 0) {
    // Servicio sin nadie que lo preste: la UI lo trata como «sin huecos».
    throw new ServiceForAvailabilityNotFoundError(
      'El proveedor no tiene profesionales activos para este servicio.',
    );
  }
  if (professionalId && !service.professionalIds.includes(professionalId)) {
    throw new ProfessionalNotForServiceError();
  }
  const professionalIds = professionalId ? [professionalId] : service.professionalIds;

  const { dayStart, dayEnd } = getUtcDayBounds(date);
  const from = new Date(dayStart.getTime() - BUSY_MARGIN_MS);
  const to = new Date(dayEnd.getTime() + BUSY_MARGIN_MS);
  const [schedules, bookings, blocks] = await Promise.all([
    availabilityRepository.findProfessionalSchedules(professionalIds),
    availabilityRepository.findBookingsForProviders([service.providerId], from, to),
    availabilityRepository.findScheduleBlocksForProviders([service.providerId], from, to),
  ]);
  // Un bloqueo ocupa igual que una reserva: el motor puro no los distingue.
  const busyByProfessional = groupBusy([...bookings, ...blocks]);
  const scheduleById = new Map(schedules.map((row) => [row.id, row]));
  const earliestMs = getEarliestBookableStart(now).getTime();

  const slotsByProfessional = new Map<string, Slot[]>();
  let firstInvalid: InvalidScheduleError | null = null;
  for (const id of professionalIds) {
    const record = scheduleById.get(id);
    // Dado de baja entre la lectura del servicio y esta: no ofrece huecos.
    if (!record) continue;
    const parsed = weeklyScheduleSchema.safeParse(record.schedule);
    if (!parsed.success) {
      const error = new InvalidScheduleError(
        'El horario del profesional no tiene un formato válido.',
        parsed.error.issues,
      );
      if (professionalId) throw error;
      console.error('[availability] schedule inválido en professional %s', id, error.issues);
      firstInvalid ??= error;
      continue;
    }
    const slots = computeAvailableSlots({
      date,
      schedule: parsed.data,
      bufferMinutes: record.bufferMinutes,
      serviceDurationMinutes: service.durationMinutes,
      bookings: busyByProfessional.get(id) ?? [],
      timezone: BUSINESS_TIMEZONE,
    }).filter((slot) => slot.startAt.getTime() >= earliestMs);
    slotsByProfessional.set(id, slots);
  }
  if (slotsByProfessional.size === 0 && firstInvalid) throw firstInvalid;

  // Unión por hora de inicio. Todos comparten la duración del servicio,
  // así que dos huecos con el mismo inicio son la misma franja.
  const union = new Map<number, Slot>();
  const candidatesByStart = new Map<number, string[]>();
  for (const id of professionalIds) {
    for (const slot of slotsByProfessional.get(id) ?? []) {
      const key = slot.startAt.getTime();
      if (!union.has(key)) union.set(key, slot);
      candidatesByStart.set(key, [...(candidatesByStart.get(key) ?? []), id]);
    }
  }

  return {
    providerId: service.providerId,
    durationMinutes: service.durationMinutes,
    professionalIds,
    slots: [...union.values()].sort((a, b) => a.startAt.getTime() - b.startAt.getTime()),
    slotsByProfessional,
    candidatesByStart,
  };
}

/**
 * Slots disponibles de un servicio en un día: la unión de sus
 * profesionales, o los de uno concreto si se indica.
 *
 * @throws las mismas excepciones que `getServiceDaySlots`.
 */
export async function getSlotsForService(
  serviceId: string,
  date: Date,
  now: Date = new Date(),
  professionalId?: string,
): Promise<Slot[]> {
  return (await getServiceDaySlots(serviceId, date, now, professionalId)).slots;
}
