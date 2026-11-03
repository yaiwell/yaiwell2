/**
 * Lecturas para ordenar a los profesionales candidatos de una reserva
 * «cualquiera disponible». Solo Prisma; el orden lo decide
 * `booking.candidates.ts`.
 */
import { prisma } from '@/lib/db/prisma';

import { activeBookingWhere } from './booking.hold';

export const bookingCandidatesRepository = {
  /** Fecha de alta de cada profesional (desempate «el más antiguo»). */
  async findProfessionalsCreatedAt(
    professionalIds: readonly string[],
  ): Promise<{ id: string; createdAt: Date }[]> {
    if (professionalIds.length === 0) return [];
    return prisma.professional.findMany({
      where: { id: { in: professionalIds as string[] } },
      select: { id: true, createdAt: true },
    });
  },

  /**
   * Reservas activas de cada profesional que empiezan en `[from, to)`,
   * con el mismo criterio de «activa» que bloquea huecos.
   */
  async countActiveBookingsByProfessional(
    professionalIds: readonly string[],
    from: Date,
    to: Date,
    now: Date,
  ): Promise<Map<string, number>> {
    const counts = new Map<string, number>();
    if (professionalIds.length === 0) return counts;
    const rows = await prisma.booking.groupBy({
      by: ['professionalId'],
      where: {
        professionalId: { in: professionalIds as string[] },
        ...activeBookingWhere(now),
        startAt: { gte: from, lt: to },
      },
      _count: { _all: true },
    });
    for (const row of rows) counts.set(row.professionalId, row._count._all);
    return counts;
  },
};
