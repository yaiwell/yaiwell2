'use server';

import { revalidatePath } from 'next/cache';

import { requireCurrentProvider } from '@/lib/auth/server';
import { prisma } from '@/lib/db/prisma';
import type { AppLocale } from '@/i18n/routing';

/**
 * Resultado serializable de las server actions del listado de servicios.
 * Errores tipados con código pequeño para que el cliente decida copy
 * sin filtrar detalles internos.
 */
export type ServicesActionState =
  | { ok: true }
  | {
      ok: false;
      code: 'PROVIDER_NOT_FOUND' | 'SERVICE_NOT_FOUND' | 'FORBIDDEN' | 'INTERNAL';
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
      data: { isActive: nextValue },
    });
  } catch (err) {
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
