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
   */
  async upsertByClerkId(input: ClerkUserSyncInput) {
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
