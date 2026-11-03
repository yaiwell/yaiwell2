/**
 * Quién del equipo acepta reservas nuevas según el plan (CLAUDE.md
 * §4.bis «Equipo», decidido 2026-11-03).
 *
 * Regla: de los profesionales activos (sin `deletedAt`), solo cuentan los
 * N más antiguos, con N = `Plan.maxProfessionals` (`null` = sin límite).
 * Al bajar de plan nadie se borra ni se desactiva: los que sobran dejan de
 * ofrecer huecos y el panel los marca «Fuera de tu plan». Al volver a
 * subir de plan, vuelven solos. Mismo criterio de antigüedad que los
 * servicios ocultos por el plan (`applyPlanLimits`).
 *
 * Las lecturas viven en `teamRepository`; aquí solo el corte y la
 * orquestación. Lo usan el motor de disponibilidad, la reserva y la
 * ficha pública por ruta directa: el barrel de `team` arrastra servicios
 * que importan `provider-onboarding` y crearía ciclos.
 */
import type { Prisma } from '@prisma/client';

import { prisma } from '@/lib/db/prisma';

import { teamRepository } from './team.repository';

type Db = typeof prisma | Prisma.TransactionClient;

/**
 * Se queda con los `max` primeros de una lista ya ordenada por antigüedad.
 * Pura.
 *
 * @param orderedIds — profesionales activos, el más antiguo primero.
 * @param max — `Plan.maxProfessionals`; `null` = todos.
 */
export function selectBookableIds(orderedIds: readonly string[], max: number | null): string[] {
  if (max === null) return [...orderedIds];
  return orderedIds.slice(0, Math.max(0, max));
}

/**
 * Profesionales del negocio que pueden recibir reservas nuevas.
 *
 * Dos lecturas pequeñas (plan y equipo activo) en paralelo. Un negocio
 * inexistente devuelve lista vacía: el motor lo trata como «sin huecos».
 *
 * @param providerId — negocio.
 * @param db — cliente o transacción; por defecto el global.
 * @returns ids en orden de antigüedad.
 */
export async function getBookableProfessionalIds(
  providerId: string,
  db: Db = prisma,
): Promise<string[]> {
  const [max, activeIds] = await Promise.all([
    teamRepository.findMaxProfessionals(providerId, db),
    teamRepository.findActiveIds(providerId, db),
  ]);
  if (max === undefined) return [];
  return selectBookableIds(activeIds, max);
}
