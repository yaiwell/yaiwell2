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
   * Persiste el `stripeAccountId` recién creado por Stripe. Update
   * atómico — Stripe es idempotente para `accounts.create` solo si
   * pasas `idempotencyKey`, pero como llamamos solo cuando no había
   * cuenta previa, no hace falta.
   */
  async setStripeAccountId(providerId: string, stripeAccountId: string): Promise<void> {
    await prisma.provider.update({
      where: { id: providerId },
      data: { stripeAccountId },
    });
  },
};
