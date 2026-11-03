/**
 * Asignación de profesional en una reserva «cualquiera disponible»
 * (CLAUDE.md §4.bis «Equipo», decidido 2026-11-03).
 *
 * Orden de preferencia:
 *  1. Quien tiene esa hora liberada con descuento: el cliente vio ese
 *     precio y el negocio quiere vender ese hueco. Entre varios, el de
 *     mayor descuento vigente, que es el que se anuncia.
 *  2. Quien tiene menos reservas activas ese día de Madrid: reparte la
 *     carga del equipo.
 *  3. El más antiguo (`createdAt`), y por id como último desempate para
 *     que el orden sea estable.
 */
import { getMadridDateKey, getMadridDayRange } from '@/lib/utils/madrid-week';

import { bookingCandidatesRepository } from './booking.candidates.repository';

/** Datos de un candidato necesarios para ordenarlo. */
export interface BookingCandidate {
  professionalId: string;
  /** % vigente de su oferta en esa hora, o `null` si no tiene. */
  offerDiscountPct: number | null;
  /** Reservas activas ese día de Madrid. */
  dayBookings: number;
  createdAt: Date;
}

/**
 * Ordena los candidatos según la preferencia de arriba. Pura.
 *
 * @returns ids de profesional, el preferido primero.
 */
export function pickCandidates(candidates: readonly BookingCandidate[]): string[] {
  return [...candidates]
    .sort((a, b) => {
      const offerA = a.offerDiscountPct ?? -1;
      const offerB = b.offerDiscountPct ?? -1;
      if (offerA !== offerB) return offerB - offerA;
      if (a.dayBookings !== b.dayBookings) return a.dayBookings - b.dayBookings;
      const age = a.createdAt.getTime() - b.createdAt.getTime();
      if (age !== 0) return age;
      return a.professionalId.localeCompare(b.professionalId);
    })
    .map((c) => c.professionalId);
}

/**
 * Carga lo necesario (carga del día y antigüedad, dos consultas en
 * total) y ordena los candidatos con `pickCandidates`.
 *
 * @param candidates — profesionales que pueden atender la hora, con su oferta.
 * @param slotStart — inicio de la reserva (define el día de Madrid).
 * @param now — reloj de la reserva, para el criterio de «activa».
 */
export async function rankCandidates(
  candidates: readonly { professionalId: string; offer: { discountPct: number } | null }[],
  slotStart: Date,
  now: Date,
): Promise<string[]> {
  if (candidates.length <= 1) return candidates.map((c) => c.professionalId);
  const ids = candidates.map((c) => c.professionalId);
  const { start, end } = getMadridDayRange(getMadridDateKey(slotStart));
  const [created, counts] = await Promise.all([
    bookingCandidatesRepository.findProfessionalsCreatedAt(ids),
    bookingCandidatesRepository.countActiveBookingsByProfessional(ids, start, end, now),
  ]);
  const createdById = new Map(created.map((row) => [row.id, row.createdAt]));
  return pickCandidates(
    candidates.map((c) => ({
      professionalId: c.professionalId,
      // Una oferta con 0 % en este tramo no abarata nada: no da prioridad.
      offerDiscountPct: c.offer && c.offer.discountPct > 0 ? c.offer.discountPct : null,
      dayBookings: counts.get(c.professionalId) ?? 0,
      createdAt: createdById.get(c.professionalId) ?? new Date(0),
    })),
  );
}
