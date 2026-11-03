/**
 * Repositorio de bloqueos de agenda: solo lectura y escritura Prisma.
 *
 * Lo importan por ruta directa `availability`, `booking`, `slot-offers`
 * y `checkout` (no por el barrel): solo depende de Prisma y de
 * `booking.hold`, así que nunca cierra un ciclo de imports.
 */
import type { Prisma } from '@prisma/client';

import { prisma } from '@/lib/db/prisma';
import { activeBookingWhere } from '@/lib/services/booking/booking.hold';

import type { ScheduleBlockSpan, ScheduleBlockSummary } from './schedule-blocks.types';

/** Cliente de BD: el global o el de una transacción en curso. */
type Db = typeof prisma | Prisma.TransactionClient;

/** Bloqueo vivo (no quitado) que solapa `[from, to)`. */
function activeOverlapWhere(from: Date, to: Date) {
  return { deletedAt: null, startAt: { lt: to }, endAt: { gt: from } };
}

export const scheduleBlocksRepository = {
  /** Profesionales activos del negocio, con su nombre (destino del bloqueo). */
  async findActiveProfessionals(providerId: string): Promise<{ id: string; name: string }[]> {
    return prisma.professional.findMany({
      where: { providerId, deletedAt: null },
      select: { id: true, name: true },
      orderBy: { id: 'asc' },
    });
  },

  /** Bloqueos activos de un negocio que solapan `[from, to)` (calendario del panel). */
  async findForProviderRange(
    providerId: string,
    from: Date,
    to: Date,
  ): Promise<ScheduleBlockSummary[]> {
    return prisma.scheduleBlock.findMany({
      where: { providerId, ...activeOverlapWhere(from, to) },
      select: { id: true, professionalId: true, startAt: true, endAt: true, reason: true },
      orderBy: { startAt: 'asc' },
    });
  },

  /** Tramos bloqueados de un profesional en `[from, to)` (motor de huecos). */
  async findSpansForProfessional(
    professionalId: string,
    from: Date,
    to: Date,
    db: Db = prisma,
  ): Promise<{ startAt: Date; endAt: Date }[]> {
    return db.scheduleBlock.findMany({
      where: { professionalId, ...activeOverlapWhere(from, to) },
      select: { startAt: true, endAt: true },
      orderBy: { startAt: 'asc' },
    });
  },

  /**
   * Tramos bloqueados de varios negocios en `[from, to)`. Filtra por
   * `providerId` para no depender de la lectura de horarios y poder
   * lanzarse en paralelo con ella (listado público).
   */
  async findSpansForProviders(
    providerIds: readonly string[],
    from: Date,
    to: Date,
  ): Promise<ScheduleBlockSpan[]> {
    if (providerIds.length === 0) return [];
    return prisma.scheduleBlock.findMany({
      where: { providerId: { in: providerIds as string[] }, ...activeOverlapWhere(from, to) },
      select: { professionalId: true, startAt: true, endAt: true },
      orderBy: { startAt: 'asc' },
    });
  },

  /** ¿Hay algún bloqueo activo del profesional que pise `[start, end)`? */
  async hasActiveOverlap(
    professionalId: string,
    start: Date,
    end: Date,
    db: Db = prisma,
  ): Promise<boolean> {
    const count = await db.scheduleBlock.count({
      where: { professionalId, ...activeOverlapWhere(start, end) },
    });
    return count > 0;
  },

  /**
   * Reservas activas que pisan `[start, end)`, con lo que el panel
   * necesita para enseñarlas. Mismo criterio de «activa» que
   * `createBooking` (`activeBookingWhere`).
   */
  async findConflictingBookings(
    tx: Prisma.TransactionClient,
    professionalId: string,
    start: Date,
    end: Date,
    now: Date,
  ) {
    return tx.booking.findMany({
      where: {
        professionalId,
        ...activeBookingWhere(now),
        startAt: { lt: end },
        endAt: { gt: start },
      },
      select: {
        id: true,
        startAt: true,
        client: { select: { fullName: true } },
        service: { select: { name: true } },
      },
      orderBy: { startAt: 'asc' },
    });
  },

  /**
   * Retira las ofertas de hueco activas que solapan el bloqueo: dejarían
   * de poder comprarse y no deben seguir anunciándose.
   *
   * @returns cuántas se retiraron.
   */
  async withdrawOverlappingOffers(
    tx: Prisma.TransactionClient,
    professionalId: string,
    start: Date,
    end: Date,
    now: Date,
  ): Promise<number> {
    const { count } = await tx.slotOffer.updateMany({
      where: { professionalId, status: 'active', startAt: { lt: end }, endAt: { gt: start } },
      data: { status: 'withdrawn', withdrawnAt: now },
    });
    return count;
  },

  async create(
    tx: Prisma.TransactionClient,
    data: {
      providerId: string;
      professionalId: string;
      startAt: Date;
      endAt: Date;
      reason: string | null;
      createdBy: string;
    },
  ): Promise<{ id: string }> {
    return tx.scheduleBlock.create({ data, select: { id: true } });
  },

  async findById(id: string) {
    return prisma.scheduleBlock.findUnique({
      where: { id },
      select: { id: true, providerId: true, deletedAt: true },
    });
  },

  /**
   * Borrado suave condicional a «sigue activo»: dos clics seguidos no
   * pisan el `deletedBy` del primero.
   */
  async softDelete(id: string, deletedBy: string, now: Date): Promise<void> {
    await prisma.scheduleBlock.updateMany({
      where: { id, deletedAt: null },
      data: { deletedAt: now, deletedBy },
    });
  },
};
