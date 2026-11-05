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
   * Marca la cuenta como eliminada sin tocar sus datos. Es para quien la
   * perdió en Clerk con obligaciones vivas: el email sigue sirviendo a soporte
   * y un nuevo registro con ese email recupera la fila.
   */
  softDeleteByClerkId(clerkId: string) {
    return prisma.user.update({ where: { clerkId }, data: { deletedAt: new Date() } });
  },

  /**
   * Indica si la persona tiene un negocio vivo o reservas sin cerrar.
   *
   * @param userId — `User.id` interno.
   */
  async hasOpenObligations(userId: string): Promise<boolean> {
    const [providers, bookings] = await Promise.all([
      prisma.provider.count({ where: { userId, deletedAt: null } }),
      prisma.booking.count({
        where: { clientId: userId, status: { in: ['pending', 'confirmed'] } },
      }),
    ]);
    return providers > 0 || bookings > 0;
  },

  /**
   * Anonimiza a quien ha eliminado su cuenta. La fila se conserva porque
   * reservas y comisiones son datos que la ley obliga a guardar; deja de
   * identificar a la persona. Las reseñas se mantienen como «Anónimo».
   *
   * El email usa un dominio `.invalid`: `deliverEmail` no envía a esos
   * dominios y el mismo email puede volver a registrarse como cuenta nueva,
   * sin recuperar nada. Idempotente: al cambiar `clerkId`, una segunda
   * llamada (acción y webhook) no encuentra la fila.
   *
   * @returns la fila anonimizada o `null` si ya no existe ese `clerkId`.
   */
  async anonymizeByClerkId(clerkId: string) {
    const user = await prisma.user.findUnique({ where: { clerkId }, select: { id: true } });
    if (!user) return null;
    return prisma.$transaction(async (tx) => {
      // Texto libre y fotos de la persona: pueden identificarla.
      await tx.booking.updateMany({
        where: { clientId: user.id, notes: { not: null } },
        data: { notes: null },
      });
      // Notas de soporte sobre sus reservas: texto libre que puede nombrarla.
      // Quién y cuándo se quedan: son la auditoría del dinero.
      await tx.booking.updateMany({
        where: {
          clientId: user.id,
          OR: [{ incidentRefundNote: { not: null } }, { refundDismissReason: { not: null } }],
        },
        data: { incidentRefundNote: null, refundDismissReason: null },
      });
      await tx.review.updateMany({ where: { authorId: user.id }, data: { photos: [] } });
      return tx.user.update({
        where: { id: user.id },
        data: {
          clerkId: `deleted_${user.id}`,
          email: `deleted-${user.id}@deleted.yaiwell.invalid`,
          fullName: null,
          avatarUrl: null,
          deletedAt: new Date(),
        },
      });
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
