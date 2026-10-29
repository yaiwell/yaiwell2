import { prisma } from '@/lib/db/prisma';

import type { ClerkUserSyncInput } from './user.types';

/**
 * Repositorio de usuarios: encapsula las queries Prisma del dominio.
 *
 * Las reglas de negocio (resolver email primario, decidir rol, etc.)
 * viven en `user.service.ts`. Aquí solo escribimos/leemos rows.
 */
export const userRepository = {
  /**
   * Inserta o actualiza el usuario por `clerkId`. Se usa en `user.created`
   * y como red de seguridad en `user.updated` (si el created se perdió,
   * el updated lo crea).
   *
   * Si no hay fila con ese `clerkId` pero sí con el mismo email, la
   * reenlazamos: es la misma persona con un id nuevo de Clerk (al pasar de
   * la instancia de desarrollo a la de producción, cada usuario recibe otro
   * id). Sin esto el alta chocaría con el UNIQUE de `email` y perdería sus
   * reservas, su negocio y su cuenta de Stripe. Es seguro porque Clerk solo
   * da como email primario uno verificado.
   */
  async upsertByClerkId(input: ClerkUserSyncInput) {
    const relinked = await relinkByEmail(input.clerkId, input.email);
    if (relinked) console.warn('[user] relinked existing user to new clerkId:', relinked);
    return prisma.user.upsert({
      where: { clerkId: input.clerkId },
      create: {
        clerkId: input.clerkId,
        email: input.email,
        role: input.role,
        locale: input.locale,
        fullName: input.fullName,
        avatarUrl: input.avatarUrl,
      },
      update: {
        email: input.email,
        role: input.role,
        locale: input.locale,
        fullName: input.fullName,
        avatarUrl: input.avatarUrl,
        // Si el usuario fue soft-deleted y vuelve, lo "resucitamos" al
        // recibir un evento de Clerk: la fuente de verdad es Clerk.
        deletedAt: null,
      },
    });
  },

  /**
   * Soft delete por `clerkId`. Devuelve `null` si el usuario no existe.
   * No usamos `delete` físico para conservar FKs en bookings y reviews.
   */
  async softDeleteByClerkId(clerkId: string) {
    const user = await prisma.user.findUnique({ where: { clerkId } });
    if (!user) return null;
    return prisma.user.update({
      where: { clerkId },
      data: { deletedAt: new Date() },
    });
  },

  async findByClerkId(clerkId: string) {
    return prisma.user.findUnique({ where: { clerkId } });
  },
};

/**
 * Pasa al `clerkId` nuevo la fila que tenga ese email y otro `clerkId`.
 * Condicional: si ya existe una fila con el `clerkId` nuevo, no toca nada.
 *
 * @returns id interno de la fila reenlazada, o `null` si no hacía falta.
 */
async function relinkByEmail(clerkId: string, email: string): Promise<string | null> {
  const existing = await prisma.user.findUnique({ where: { clerkId }, select: { id: true } });
  if (existing) return null;
  const byEmail = await prisma.user.findUnique({
    where: { email },
    select: { id: true, clerkId: true },
  });
  if (!byEmail || byEmail.clerkId === clerkId) return null;
  await prisma.user.update({ where: { id: byEmail.id }, data: { clerkId } });
  return byEmail.id;
}
