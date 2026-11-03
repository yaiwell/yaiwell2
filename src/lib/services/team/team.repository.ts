/**
 * Acceso a datos del dominio `team`. Solo Prisma: las reglas (cupo del
 * plan, citas futuras, servicios sin nadie) viven en `team.service.ts` y
 * `team.lifecycle.ts`.
 *
 * Toda lectura filtra por `providerId`: un id de otro negocio se
 * comporta como inexistente.
 */
import type { Prisma } from '@prisma/client';

import { prisma } from '@/lib/db/prisma';
import { activeBookingWhere } from '@/lib/services/booking/booking.hold';

type Db = typeof prisma | Prisma.TransactionClient;

/** Servicio «vivo» del negocio (no borrado). */
function liveServiceWhere(providerId: string): Prisma.ServiceWhereInput {
  return { providerId, deletedAt: null };
}

/**
 * Repositorio del equipo: altas, ediciones, bajas, cupo del plan y las
 * lecturas que alimentan el panel, el motor y la reserva. Sin reglas de
 * negocio; cada método acepta un cliente de transacción opcional.
 */
export const teamRepository = {
  /** Equipo completo (activos y de baja), por antigüedad. */
  async findMembers(providerId: string, db: Db = prisma) {
    return db.professional.findMany({
      where: { providerId },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      select: {
        id: true,
        name: true,
        photo: true,
        deletedAt: true,
        _count: { select: { serviceLinks: { where: { service: { deletedAt: null } } } } },
      },
    });
  },

  /** Un profesional del negocio (también de baja), con sus servicios vivos. */
  async findMember(providerId: string, professionalId: string, db: Db = prisma) {
    return db.professional.findFirst({
      where: { id: professionalId, providerId },
      select: {
        id: true,
        name: true,
        photo: true,
        bio: true,
        schedule: true,
        deletedAt: true,
        serviceLinks: {
          where: { service: { deletedAt: null } },
          select: { serviceId: true },
        },
      },
    });
  },

  /** Servicios no borrados del negocio, para las casillas del formulario. */
  async findServiceOptions(providerId: string, db: Db = prisma) {
    return db.service.findMany({
      where: liveServiceWhere(providerId),
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      select: { id: true, name: true },
    });
  },

  /** Cuántos de `serviceIds` son servicios vivos del negocio. */
  async countOwnServices(providerId: string, serviceIds: readonly string[], db: Db = prisma) {
    if (serviceIds.length === 0) return 0;
    return db.service.count({
      where: { ...liveServiceWhere(providerId), id: { in: serviceIds as string[] } },
    });
  },

  /**
   * Servicios vivos (publicados y pausados) con los profesionales activos
   * que los prestan. Base de la asignación y de detectar servicios que
   * se quedarían sin nadie.
   */
  async findServicesWithStaff(providerId: string, db: Db = prisma) {
    return db.service.findMany({
      where: liveServiceWhere(providerId),
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      select: {
        id: true,
        name: true,
        isActive: true,
        professionals: {
          where: { professional: { deletedAt: null } },
          select: { professionalId: true },
        },
      },
    });
  },

  /**
   * Bloquea la fila del negocio hasta el fin de la transacción y devuelve
   * el cupo de su plan. Serializa altas y reactivaciones simultáneas
   * (mismo bloqueo que toma `assertCanPublishService`).
   *
   * @returns `undefined` si el negocio no existe; `null` = sin límite.
   */
  async lockProviderPlan(
    providerId: string,
    db: Prisma.TransactionClient,
  ): Promise<number | null | undefined> {
    // Los ids son `text` en BD: se comparan sin `::uuid`.
    const rows = await db.$queryRaw<Array<{ maxProfessionals: number | null }>>`
      SELECT pl."maxProfessionals" AS "maxProfessionals"
      FROM providers p
      JOIN plans pl ON pl.id = p."planId"
      WHERE p.id = ${providerId}
      FOR UPDATE OF p
    `;
    const row = rows[0];
    if (!row) return undefined;
    return row.maxProfessionals === null ? null : Number(row.maxProfessionals);
  },

  /** Plan del negocio sin bloquear (solo para pintar el contador). */
  async findMaxProfessionals(providerId: string, db: Db = prisma) {
    const row = await db.provider.findUnique({
      where: { id: providerId },
      select: { plan: { select: { maxProfessionals: true } } },
    });
    return row ? row.plan.maxProfessionals : undefined;
  },

  /**
   * Ids de los profesionales activos del negocio, por antigüedad. El
   * `id` desempata altas en el mismo milisegundo: el corte del plan
   * debe salir igual en todas las lecturas.
   */
  async findActiveIds(providerId: string, db: Db = prisma): Promise<string[]> {
    const rows = await db.professional.findMany({
      where: { providerId, deletedAt: null },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      select: { id: true },
    });
    return rows.map((row) => row.id);
  },

  /** Profesionales activos del negocio. */
  async countActive(providerId: string, db: Db = prisma) {
    return db.professional.count({ where: { providerId, deletedAt: null } });
  },

  /**
   * Citas que ocupan agenda (`confirmed`, o `pending` dentro de su
   * retención) y aún no han empezado. Son las que impiden la baja.
   */
  async findFutureActiveBookings(professionalId: string, now: Date, db: Db = prisma) {
    return db.booking.findMany({
      where: { professionalId, ...activeBookingWhere(now), startAt: { gte: now } },
      orderBy: { startAt: 'asc' },
      take: 50,
      select: { id: true, startAt: true, service: { select: { name: true } } },
    });
  },

  async create(
    providerId: string,
    data: { name: string; bio: string | null; photo: string | null; schedule: unknown },
    db: Db = prisma,
  ) {
    return db.professional.create({
      data: {
        providerId,
        name: data.name,
        bio: data.bio,
        photo: data.photo,
        schedule: data.schedule as Prisma.InputJsonValue,
      },
      select: { id: true },
    });
  },

  async update(
    professionalId: string,
    data: { name: string; bio: string | null; photo: string | null; schedule: unknown },
    db: Db = prisma,
  ) {
    await db.professional.update({
      where: { id: professionalId },
      data: {
        name: data.name,
        bio: data.bio,
        photo: data.photo,
        schedule: data.schedule as Prisma.InputJsonValue,
      },
    });
  },

  /**
   * Toma el mismo cerrojo de agenda que `createBooking`
   * (`bookingRepository.lockProfessional`): una reserva en curso para
   * este profesional y su baja no se cruzan.
   */
  async lockProfessionalAgenda(professionalId: string, db: Prisma.TransactionClient) {
    await db.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${professionalId}))`;
  },

  /**
   * Retira las ofertas de hueco con descuento aún abiertas (activas y
   * sin terminar) de un profesional. Las ya pasadas se dejan como
   * están: no se anuncian y conservan su historial.
   *
   * @returns cuántas se retiraron.
   */
  async withdrawOpenOffers(professionalId: string, now: Date, db: Db = prisma) {
    const { count } = await db.slotOffer.updateMany({
      where: { professionalId, status: 'active', endAt: { gt: now } },
      data: { status: 'withdrawn', withdrawnAt: now },
    });
    return count;
  },

  /** Marca la baja (`deletedAt`) o la deshace (`null`). */
  async setDeletedAt(professionalId: string, deletedAt: Date | null, db: Db = prisma) {
    await db.professional.update({ where: { id: professionalId }, data: { deletedAt } });
  },
};
