'use server';

import { revalidatePath } from 'next/cache';

import type { AppLocale } from '@/i18n/routing';
import { requireCurrentProvider } from '@/lib/auth/server';
import { prisma } from '@/lib/db/prisma';
import {
  assertCanPublishService,
  PlanServiceLimitReachedError,
} from '@/lib/services/billing/billing.plan-limits';

/**
 * Resultado serializable de las server actions del listado de servicios.
 * Errores tipados con código pequeño para que el cliente decida copy
 * sin filtrar detalles internos.
 */
export type ServicesActionState =
  | { ok: true }
  | {
      ok: false;
      code:
        | 'PROVIDER_NOT_FOUND'
        | 'SERVICE_NOT_FOUND'
        | 'FORBIDDEN'
        // Reactivar superaría el límite de servicios del plan.
        | 'PLAN_LIMIT_REACHED'
        | 'INTERNAL';
    };

/**
 * Alterna el estado `isActive` de un Service del proveedor autenticado.
 *
 * Reglas:
 *  - El service debe pertenecer al provider activo (ownership check).
 *  - Update idempotente — si el cliente envía `nextValue` igual al actual,
 *    no rompe; revalida igualmente para que la UI se sincronice.
 *  - Soft-pause: `isActive=false` oculta el servicio en búsqueda pública
 *    y en el flujo de reserva, pero las métricas históricas (dashboard,
 *    bookings pasadas) siguen funcionando porque no tocamos `deletedAt`.
 *  - Activar respeta el límite de servicios del plan: se comprueba y se
 *    escribe en la misma transacción, con la fila del negocio bloqueada.
 *  - Tanto activar como pausar a mano limpian `pausedByPlanAt`: la
 *    decisión del negocio manda sobre la del plan, y un servicio que él
 *    pausó no debe reactivarse solo al subir de plan.
 */
export async function toggleServiceActiveAction(
  locale: AppLocale,
  serviceId: string,
  nextValue: boolean,
): Promise<ServicesActionState> {
  let providerId: string;
  try {
    const provider = await requireCurrentProvider(locale);
    providerId = provider.id;
  } catch {
    return { ok: false, code: 'PROVIDER_NOT_FOUND' };
  }

  // Ownership: el service debe ser del provider activo.
  const existing = await prisma.service.findUnique({
    where: { id: serviceId },
    // `isActive` no se lee aquí: fuera de la transacción puede estar
    // desfasado (el sync del plan pudo ocultarlo entre medias).
    select: { id: true, providerId: true, deletedAt: true },
  });
  if (!existing || existing.deletedAt) {
    return { ok: false, code: 'SERVICE_NOT_FOUND' };
  }
  if (existing.providerId !== providerId) {
    return { ok: false, code: 'FORBIDDEN' };
  }

  try {
    await prisma.$transaction(async (tx) => {
      if (nextValue) {
        // Reenviar «activar» sobre uno ya activo es idempotente y no
        // cuenta contra el cupo. Lo comprobamos con una escritura
        // condicional dentro de la transacción: si el sync del plan lo
        // ocultó entre medias, no casa (o espera a su commit y ya no
        // casa) y pasamos por el cupo como cualquier reactivación.
        const stillActive = await tx.service.updateMany({
          where: { id: serviceId, isActive: true, deletedAt: null },
          data: { pausedByPlanAt: null },
        });
        if (stillActive.count > 0) return;
        // Pasar de pausado a activo cuenta contra el cupo, con la fila
        // del negocio bloqueada hasta el commit.
        await assertCanPublishService(tx, providerId);
      }
      await tx.service.update({
        where: { id: serviceId },
        data: { isActive: nextValue, pausedByPlanAt: null },
      });
    });
  } catch (err) {
    if (err instanceof PlanServiceLimitReachedError) {
      return { ok: false, code: 'PLAN_LIMIT_REACHED' };
    }
    console.error('[panel/servicios] toggleServiceActiveAction error:', err);
    return { ok: false, code: 'INTERNAL' };
  }

  // Invalida el cache del listado para que el badge se actualice tras
  // el navigate-back. Sin esto, el server component cachearía el render
  // previo y el estado quedaría desfasado hasta una recarga dura.
  revalidatePath(`/${locale}/panel/servicios`);
  return { ok: true };
}

/**
 * Elimina (soft-delete) un Service del proveedor autenticado.
 *
 * Reglas:
 *  - Ownership: el service debe pertenecer al provider activo.
 *  - Soft-delete: marca `deletedAt` con timestamp actual y desactiva
 *    `isActive` por coherencia (un servicio borrado no debe figurar
 *    como activo en ninguna lectura ni en posibles auditorías).
 *  - Idempotente: si el service ya tiene `deletedAt`, devolvemos
 *    `SERVICE_NOT_FOUND` — desde la perspectiva del listado, un servicio
 *    ya borrado no existe.
 *  - Las relaciones históricas (bookings pasadas con `serviceId`, métricas)
 *    se preservan porque no hacemos hard-delete.
 */
export async function deleteServiceAction(
  locale: AppLocale,
  serviceId: string,
): Promise<ServicesActionState> {
  let providerId: string;
  try {
    const provider = await requireCurrentProvider(locale);
    providerId = provider.id;
  } catch {
    return { ok: false, code: 'PROVIDER_NOT_FOUND' };
  }

  // Ownership + existencia: rechazamos los soft-deleted como si no existiesen.
  const existing = await prisma.service.findUnique({
    where: { id: serviceId },
    select: { id: true, providerId: true, deletedAt: true },
  });
  if (!existing || existing.deletedAt) {
    return { ok: false, code: 'SERVICE_NOT_FOUND' };
  }
  if (existing.providerId !== providerId) {
    return { ok: false, code: 'FORBIDDEN' };
  }

  try {
    await prisma.service.update({
      where: { id: serviceId },
      // Desactivamos también `isActive` por coherencia: ningún lector debería
      // considerar como activo un servicio que ya está borrado.
      data: { deletedAt: new Date(), isActive: false },
    });
  } catch (err) {
    console.error('[panel/servicios] deleteServiceAction error:', err);
    return { ok: false, code: 'INTERNAL' };
  }

  revalidatePath(`/${locale}/panel/servicios`);
  return { ok: true };
}
