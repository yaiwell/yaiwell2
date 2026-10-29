import type { Prisma } from '@prisma/client';

import {
  PlanLimitProviderNotFoundError,
  PlanServiceLimitReachedError,
} from './billing.plan-limits.errors';

export {
  PlanLimitProviderNotFoundError,
  PlanServiceLimitReachedError,
} from './billing.plan-limits.errors';

/**
 * Límites de servicios publicados por plan (CLAUDE.md §4.bis «Planes y
 * cuentas de negocio»).
 *
 * Un servicio «oculto por el plan» es `isActive=false` + `pausedByPlanAt`
 * con fecha. Así se distingue de uno que el negocio pausó a mano
 * (`pausedByPlanAt` null): al volver a tener cupo solo se reactivan los
 * primeros, nunca los segundos.
 *
 * Todas las funciones reciben el cliente (`tx`) en vez de importar Prisma:
 * deben ejecutarse dentro de la transacción del llamador para que la
 * comprobación y la escritura vean el mismo estado.
 */

/** Cliente de BD de una transacción en curso (o el global en lecturas). */
type Db = Prisma.TransactionClient;

/** Resultado de `applyPlanLimits`: qué servicios se ocultaron o reactivaron. */
export interface PlanLimitsResult {
  hiddenServiceIds: string[];
  restoredServiceIds: string[];
}

/** Uso del cupo de servicios de un negocio. */
export interface ServiceUsage {
  activeCount: number;
  maxServices: number;
}

/** Filtro de «servicio publicado»: el mismo criterio que usa la parte pública. */
function activeWhere(providerId: string): Prisma.ServiceWhereInput {
  return { providerId, isActive: true, deletedAt: null };
}

/**
 * Ajusta los servicios publicados de un negocio al límite de su plan.
 *
 * - Si tiene más activos que `maxServices`, conserva los N más antiguos
 *   (`createdAt ASC`: los que llevan más tiempo en la carta suelen ser los
 *   que tienen reseñas y reservas) y oculta el resto.
 * - Si le sobra cupo, reactiva los ocultos por el plan, más antiguos
 *   primero, hasta llenar el límite, y les limpia `pausedByPlanAt`.
 * - Nunca reactiva un servicio pausado a mano.
 *
 * El llamador debe haber bloqueado antes la fila del negocio
 * (`SELECT … FROM providers WHERE id = … FOR UPDATE`) en la misma
 * transacción; si no, una alta de servicio concurrente podría colarse
 * entre el recuento y la escritura.
 *
 * @param tx — cliente de la transacción en curso.
 * @param providerId — negocio a ajustar.
 * @param maxServices — `Plan.maxServices` del plan que pasa a ser efectivo.
 * @param now — instante a grabar en `pausedByPlanAt`; inyectable en tests.
 */
export async function applyPlanLimits(
  tx: Db,
  providerId: string,
  maxServices: number,
  now: Date = new Date(),
): Promise<PlanLimitsResult> {
  const limit = Math.max(0, maxServices);

  const active = await tx.service.findMany({
    where: activeWhere(providerId),
    // El `id` desempata altas en el mismo milisegundo para que el
    // resultado sea determinista entre ejecuciones.
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    select: { id: true },
  });

  if (active.length > limit) {
    const hiddenServiceIds = active.slice(limit).map((s) => s.id);
    await tx.service.updateMany({
      where: { id: { in: hiddenServiceIds } },
      data: { isActive: false, pausedByPlanAt: now },
    });
    return { hiddenServiceIds, restoredServiceIds: [] };
  }

  const freeSlots = limit - active.length;
  if (freeSlots === 0) {
    return { hiddenServiceIds: [], restoredServiceIds: [] };
  }

  const pausedByPlan = await tx.service.findMany({
    where: {
      providerId,
      isActive: false,
      deletedAt: null,
      pausedByPlanAt: { not: null },
    },
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    take: freeSlots,
    select: { id: true },
  });
  if (pausedByPlan.length === 0) {
    return { hiddenServiceIds: [], restoredServiceIds: [] };
  }

  const restoredServiceIds = pausedByPlan.map((s) => s.id);
  await tx.service.updateMany({
    where: { id: { in: restoredServiceIds } },
    data: { isActive: true, pausedByPlanAt: null },
  });
  return { hiddenServiceIds: [], restoredServiceIds };
}

/**
 * Comprueba que el negocio puede publicar un servicio más con su plan.
 *
 * Bloquea la fila de `providers` (FOR UPDATE) hasta el fin de la
 * transacción: dos altas simultáneas se serializan y la segunda ve el
 * recuento actualizado, así que nadie supera el límite por una carrera.
 * El mismo bloqueo es el que deben tomar quienes llamen a
 * `applyPlanLimits` (cambio de plan, impago).
 *
 * @param tx — cliente de la transacción en la que se va a escribir.
 * @param providerId — negocio que quiere publicar.
 * @returns el uso del cupo antes de publicar.
 * @throws PlanLimitProviderNotFoundError si el negocio no existe.
 * @throws PlanServiceLimitReachedError si ya está en el límite.
 */
export async function assertCanPublishService(tx: Db, providerId: string): Promise<ServiceUsage> {
  // Los ids son `text` en BD: se comparan sin `::uuid`.
  const rows = await tx.$queryRaw<Array<{ maxServices: number }>>`
    SELECT pl."maxServices" AS "maxServices"
    FROM providers p
    JOIN plans pl ON pl.id = p."planId"
    WHERE p.id = ${providerId}
    FOR UPDATE OF p
  `;
  const row = rows[0];
  if (!row) {
    throw new PlanLimitProviderNotFoundError();
  }

  const maxServices = Number(row.maxServices);
  const activeCount = await tx.service.count({ where: activeWhere(providerId) });
  if (activeCount >= maxServices) {
    throw new PlanServiceLimitReachedError(maxServices);
  }
  return { activeCount, maxServices };
}

/**
 * Lee el uso del cupo de servicios de un negocio, sin bloquear nada.
 * Solo para pintar el contador del panel: la decisión de publicar la
 * toma siempre `assertCanPublishService` dentro de una transacción.
 *
 * @returns `null` si el negocio no existe.
 */
export async function getServiceUsage(db: Db, providerId: string): Promise<ServiceUsage | null> {
  const provider = await db.provider.findUnique({
    where: { id: providerId },
    select: { plan: { select: { maxServices: true } } },
  });
  if (!provider) {
    return null;
  }
  const activeCount = await db.service.count({ where: activeWhere(providerId) });
  return { activeCount, maxServices: provider.plan.maxServices };
}
