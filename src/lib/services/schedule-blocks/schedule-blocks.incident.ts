/**
 * Bloqueo de agenda que crea soporte al cancelar por incidencia del centro.
 *
 * Va aparte de `createScheduleBlock`, que recibe hora de Madrid desde un
 * formulario y aplica reglas pensadas para el dueño: aquí la franja sale de la
 * reserva y el autor es el admin. Comparte con él lo importante: el bloqueo por
 * profesional que toma `createBooking` y no pisar reservas activas.
 */
import { prisma } from '@/lib/db/prisma';
// Ruta directa: el barrel de `booking` arrastra `slot-offers`.
import { bookingRepository } from '@/lib/services/booking/booking.repository';

import { scheduleBlocksRepository } from './schedule-blocks.repository';

/**
 * Bloquea la franja de una reserva cancelada. Repetible: si ya hay un bloqueo
 * que la cubre, no crea otro.
 *
 * @param args.createdBy — `User.id` interno del admin.
 * @returns `false` si otra reserva activa ocupó la franja antes del bloqueo
 *   (no se deja plantado a ese cliente en silencio).
 * @throws cualquier error de BD; el caller decide (es best effort).
 */
export async function blockSlotForCentreIncident(args: {
  providerId: string;
  professionalId: string;
  startAt: Date;
  endAt: Date;
  createdBy: string;
  now: Date;
}): Promise<boolean> {
  const { providerId, professionalId, startAt, endAt, createdBy, now } = args;

  return prisma.$transaction(async (tx) => {
    await bookingRepository.lockProfessional(tx, professionalId);

    const conflicts = await scheduleBlocksRepository.findConflictingBookings(
      tx,
      professionalId,
      startAt,
      endAt,
      now,
    );
    if (conflicts.length > 0) return false;

    await scheduleBlocksRepository.withdrawOverlappingOffers(
      tx,
      professionalId,
      startAt,
      endAt,
      now,
    );
    if (await scheduleBlocksRepository.hasCovering(tx, professionalId, startAt, endAt)) return true;

    await scheduleBlocksRepository.create(tx, {
      providerId,
      professionalId,
      startAt,
      endAt,
      reason: null,
      createdBy,
    });
    return true;
  });
}

/**
 * Lee cómo está la franja sin escribir nada.
 *
 * @returns `taken` si hay otra reserva activa, `blocked` si un bloqueo la pisa
 *   y `not_blocked` si está libre.
 * @throws cualquier error de BD.
 */
export async function readSlotForCentreIncident(
  professionalId: string,
  startAt: Date,
  endAt: Date,
  now: Date,
): Promise<'blocked' | 'not_blocked' | 'taken'> {
  return prisma.$transaction(async (tx) => {
    const conflicts = await scheduleBlocksRepository.findConflictingBookings(
      tx,
      professionalId,
      startAt,
      endAt,
      now,
    );
    if (conflicts.length > 0) return 'taken';
    const blocked = await scheduleBlocksRepository.hasActiveOverlap(
      professionalId,
      startAt,
      endAt,
      tx,
    );
    return blocked ? 'blocked' : 'not_blocked';
  });
}
