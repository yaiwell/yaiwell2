import 'server-only';

import { prisma } from '@/lib/db/prisma';

/**
 * Consultas de las invitaciones a valorar del cierre automático. Sin
 * reglas de negocio.
 */
export const reviewInvitesRepository = {
  /** De `ids`, las reservas cuya cita empezó en `notBefore` o después. */
  async findStartedSince(ids: string[], notBefore: Date): Promise<string[]> {
    if (ids.length === 0) return [];
    const rows = await prisma.booking.findMany({
      where: { id: { in: ids }, startAt: { gte: notBefore } },
      select: { id: true },
    });
    const recent = new Set(rows.map((row) => row.id));
    // Conserva el orden de entrada (el del cierre automático).
    return ids.filter((id) => recent.has(id));
  },
};
