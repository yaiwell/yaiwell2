import 'server-only';

import { prisma } from '@/lib/db/prisma';

/**
 * Repositorio del dominio `payments`.
 *
 * Capa fina sobre Prisma para leer/escribir el `stripeAccountId` del
 * Provider. Las reglas de negocio (cuándo crear cuenta, cómo refrescar
 * estado) viven en `payments.service.ts`.
 */
export const paymentsRepository = {
  /**
   * Devuelve el `id`, `stripeAccountId` y `ownerEmail` del provider.
   * El email se necesita para precrear la cuenta Stripe con el dato
   * que más fricción ahorra al dueño durante el onboarding.
   */
  async findProviderForPayments(
    providerId: string,
  ): Promise<{ id: string; stripeAccountId: string | null; ownerEmail: string } | null> {
    const row = await prisma.provider.findFirst({
      where: { id: providerId, deletedAt: null },
      select: {
        id: true,
        stripeAccountId: true,
        owner: { select: { email: true } },
      },
    });
    if (!row) return null;
    return {
      id: row.id,
      stripeAccountId: row.stripeAccountId,
      ownerEmail: row.owner.email,
    };
  },

  /**
   * Persiste el `stripeAccountId` recién creado solo si el provider aún
   * no tiene uno. El `WHERE stripeAccountId IS NULL` hace la escritura
   * atómica: con un doble clic, solo la primera petición gana.
   *
   * No usamos `idempotencyKey` en Stripe porque la clave vive 24 h: tras
   * borrar una cuenta por soporte, recrearla devolvería la ya borrada.
   *
   * @returns `true` si escribió; `false` si otra petición ganó la carrera.
   */
  async setStripeAccountIdIfEmpty(providerId: string, stripeAccountId: string): Promise<boolean> {
    const { count } = await prisma.provider.updateMany({
      // `deletedAt: null`: nunca enlazamos una cuenta a un centro borrado.
      where: { id: providerId, deletedAt: null, stripeAccountId: null },
      data: { stripeAccountId },
    });
    return count > 0;
  },
};
