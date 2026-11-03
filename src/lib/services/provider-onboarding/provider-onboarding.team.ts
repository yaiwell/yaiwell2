/**
 * Quién presta cada servicio (tabla `service_professionals`, migración
 * 9h; CLAUDE.md §4.bis «Equipo»).
 *
 * Lo usan el alta y la edición de servicios. La fase de UI del equipo
 * mandará `professionalIds`; mientras no llegue, se asignan todos los
 * profesionales activos del negocio (hoy uno por negocio), que es el
 * comportamiento de siempre.
 */
import type { Prisma } from '@prisma/client';

import { prisma } from '@/lib/db/prisma';

import { ServiceProfessionalsInvalidError } from './provider-onboarding.errors';

type Db = typeof prisma | Prisma.TransactionClient;

/** Acceso a datos de la asignación servicio ↔ profesionales. */
export const serviceTeamRepository = {
  /** Profesionales activos del negocio, por antigüedad. */
  async findActiveProfessionalIds(providerId: string, db: Db = prisma): Promise<string[]> {
    const rows = await db.professional.findMany({
      where: { providerId, deletedAt: null },
      select: { id: true },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    });
    return rows.map((row) => row.id);
  },

  /** Profesionales asignados a un servicio (incluidos los de baja). */
  async findServiceProfessionalIds(serviceId: string, db: Db = prisma): Promise<string[]> {
    const rows = await db.serviceProfessional.findMany({
      where: { serviceId },
      select: { professionalId: true },
    });
    return rows.map((row) => row.professionalId);
  },

  /**
   * Sustituye la asignación entera. También actualiza la columna
   * obsoleta `services.professionalId` (al primero) mientras convivan:
   * el código anterior a la 9h aún podía leerla.
   */
  async replaceServiceProfessionals(
    serviceId: string,
    professionalIds: readonly string[],
    db: Db = prisma,
  ): Promise<void> {
    await db.serviceProfessional.deleteMany({
      where: { serviceId, professionalId: { notIn: professionalIds as string[] } },
    });
    await db.serviceProfessional.createMany({
      data: professionalIds.map((professionalId) => ({ serviceId, professionalId })),
      skipDuplicates: true,
    });
    await db.service.update({
      where: { id: serviceId },
      data: { professionalId: professionalIds[0] ?? null },
    });
  },
};

/**
 * Decide los profesionales de un servicio.
 *
 * @param providerId — negocio dueño del servicio.
 * @param requested — ids elegidos; `undefined` = todos los activos.
 * @returns ids sin duplicados, en el orden de antigüedad del equipo.
 * @throws ServiceProfessionalsInvalidError — lista vacía, algún id que
 *   no es del negocio o está de baja, o negocio sin profesionales.
 */
export async function resolveServiceProfessionalIds(
  providerId: string,
  requested: readonly string[] | undefined,
  db: Db = prisma,
): Promise<string[]> {
  const active = await serviceTeamRepository.findActiveProfessionalIds(providerId, db);
  if (requested === undefined) {
    if (active.length === 0) throw new ServiceProfessionalsInvalidError();
    return active;
  }
  const wanted = new Set(requested);
  if (wanted.size === 0 || [...wanted].some((id) => !active.includes(id))) {
    throw new ServiceProfessionalsInvalidError();
  }
  return active.filter((id) => wanted.has(id));
}

/**
 * Aplica la asignación al editar un servicio.
 *
 * Con `professionalIds` la sustituye entera. Sin ellos la deja como
 * está, salvo que el servicio se haya quedado sin ningún profesional
 * activo: entonces le asigna todos los activos, para que no desaparezca
 * de la reserva sin que el negocio lo sepa.
 *
 * @throws ServiceProfessionalsInvalidError — ver `resolveServiceProfessionalIds`.
 */
export async function syncServiceProfessionals(
  serviceId: string,
  providerId: string,
  professionalIds: readonly string[] | undefined,
  db: Db = prisma,
): Promise<void> {
  if (professionalIds === undefined) {
    const [current, active] = await Promise.all([
      serviceTeamRepository.findServiceProfessionalIds(serviceId, db),
      serviceTeamRepository.findActiveProfessionalIds(providerId, db),
    ]);
    if (current.some((id) => active.includes(id))) return;
  }
  const ids = await resolveServiceProfessionalIds(providerId, professionalIds, db);
  await serviceTeamRepository.replaceServiceProfessionals(serviceId, ids, db);
}
