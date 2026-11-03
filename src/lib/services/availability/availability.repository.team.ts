import { prisma } from '@/lib/db/prisma';
// Ruta directa: el barrel de `team` arrastra su servicio, que usa este módulo.
import { selectBookableIds } from '@/lib/services/team/team.bookable';

import type { ProfessionalScheduleBundle } from './availability.types';

/**
 * Lecturas del motor de disponibilidad que dependen del equipo
 * (`service_professionals`, migración 9h) y del cupo del plan
 * (`Plan.maxProfessionals`, CLAUDE.md §4.bis «Equipo»).
 *
 * Van aparte de `availability.repository.ts` para que este no pase de
 * las ~250 líneas; `availabilityRepository` las reexpone tal cual.
 * Mismas reglas: solo lecturas tipadas, sin reglas de negocio salvo el
 * corte del plan, que se comparte con `team.bookable`.
 */
export const availabilityTeamRepository = {
  /**
   * Resuelve los datos mínimos de un Service necesarios para calcular
   * disponibilidad: providerId, duración y los profesionales que lo
   * prestan (tabla `service_professionals`, migración 9h). Filtra
   * `isActive` y `deletedAt` para que servicios pausados o borrados no
   * ofrezcan slots, y deja fuera a los profesionales dados de baja.
   *
   * `professionalIds` sale ordenado por antigüedad del profesional
   * (`createdAt asc`): es el desempate final de «cualquiera disponible»
   * y el orden estable en que se recorren los candidatos.
   *
   * Solo incluye a los profesionales dentro del cupo del plan (los N
   * más antiguos activos del negocio, `selectBookableIds`): tras bajar
   * de plan, los que sobran dejan de aceptar reservas nuevas. Si todos
   * los del servicio quedan fuera, la lista sale vacía y el servicio no
   * es reservable. El equipo activo viaja en la misma consulta.
   */
  async findServiceForAvailability(serviceId: string): Promise<{
    id: string;
    providerId: string;
    durationMinutes: number;
    professionalIds: string[];
  } | null> {
    const row = await prisma.service.findFirst({
      where: { id: serviceId, deletedAt: null, isActive: true },
      select: {
        id: true,
        providerId: true,
        durationMinutes: true,
        professionals: {
          where: { professional: { deletedAt: null } },
          orderBy: [{ professional: { createdAt: 'asc' } }, { professionalId: 'asc' }],
          select: { professionalId: true },
        },
        provider: {
          select: {
            plan: { select: { maxProfessionals: true } },
            professionals: {
              where: { deletedAt: null },
              orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
              select: { id: true },
            },
          },
        },
      },
    });
    if (!row) return null;
    const bookable = new Set(
      selectBookableIds(
        row.provider.professionals.map((p) => p.id),
        row.provider.plan.maxProfessionals,
      ),
    );
    return {
      id: row.id,
      providerId: row.providerId,
      durationMinutes: row.durationMinutes,
      professionalIds: row.professionals
        .map((link) => link.professionalId)
        .filter((id) => bookable.has(id)),
    };
  },

  /**
   * Horarios en crudo de varios profesionales en una sola consulta, para
   * calcular la rejilla de un servicio con varios profesionales sin N+1.
   * Los dados de baja no aparecen.
   */
  async findProfessionalSchedules(
    professionalIds: readonly string[],
  ): Promise<{ id: string; schedule: unknown; bufferMinutes: number }[]> {
    if (professionalIds.length === 0) return [];
    return prisma.professional.findMany({
      where: { id: { in: professionalIds as string[] }, deletedAt: null },
      select: { id: true, schedule: true, bufferMinutes: true },
    });
  },

  /**
   * Lectura BATCH de los horarios de todos los profesionales de un
   * conjunto de proveedores, junto a la duración del servicio más corto
   * que cada uno puede prestar.
   *
   * Existe para que el listado público pueda pintar disponibilidad real
   * sin caer en la cascada N×M (un query por proveedor × profesional)
   * que hacía inviable conectarlo. Una sola consulta cubre toda la
   * página de resultados.
   *
   * La subquery de duración solo cuenta los servicios que ese
   * profesional presta según `service_professionals` (migración 9h):
   * con varios profesionales, uno que no presta ningún servicio activo
   * no puede dar «disponible ahora» al centro.
   *
   * Filtra servicios pausados (`isActive = false`) y borrados: un
   * proveedor sin catálogo activo devuelve `NULL` y acabará como `busy`.
   *
   * Solo devuelve profesionales dentro del cupo del plan: la ventana
   * `ROW_NUMBER` replica en SQL `selectBookableIds` (los N más antiguos
   * activos de cada negocio, mismo desempate por id).
   */
  async findScheduleBundlesForProviders(
    providerIds: readonly string[],
  ): Promise<ProfessionalScheduleBundle[]> {
    if (providerIds.length === 0) return [];

    // Los ids del schema Prisma son columnas `text`, no `uuid` nativo:
    // el cast debe ser a `text[]` (un `::uuid[]` reventaría la query).
    const rows = await prisma.$queryRaw<
      {
        professionalId: string;
        providerId: string;
        schedule: unknown;
        bufferMinutes: number;
        minServiceDurationMinutes: number | null;
      }[]
    >`
      WITH ranked AS (
        SELECT
          p.*,
          ROW_NUMBER() OVER (
            PARTITION BY p."providerId" ORDER BY p."createdAt" ASC, p.id ASC
          ) AS rank
        FROM professionals p
        WHERE p."providerId" = ANY(${providerIds as string[]}::text[])
          AND p."deletedAt" IS NULL
      )
      SELECT
        pr.id AS "professionalId",
        pr."providerId",
        pr.schedule,
        pr."bufferMinutes",
        (
          SELECT MIN(s."durationMinutes")
          FROM services s
          JOIN service_professionals sp ON sp."serviceId" = s.id
          WHERE sp."professionalId" = pr.id
            AND s."providerId" = pr."providerId"
            AND s."isActive" = true
            AND s."deletedAt" IS NULL
        )::int AS "minServiceDurationMinutes"
      FROM ranked pr
      JOIN providers prov ON prov.id = pr."providerId"
      JOIN plans pl ON pl.id = prov."planId"
      WHERE pl."maxProfessionals" IS NULL OR pr.rank <= pl."maxProfessionals"
    `;

    return rows;
  },
};
