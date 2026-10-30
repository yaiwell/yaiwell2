import 'server-only';

import type { Prisma } from '@prisma/client';

import { prisma } from '@/lib/db/prisma';

import type { ProviderOnsiteStatus } from './checkout.onsite';

/**
 * Lecturas del pago en el local. Solo acceso a datos; las reglas viven
 * en `checkout.onsite.ts`.
 */
export const onsiteRepository = {
  /**
   * Lo que decide si el negocio admite ahora pago en el local. `null` si
   * el negocio no existe o está borrado.
   *
   * @param client — transacción en curso para releerlo junto a la
   *   creación de la reserva; por defecto, el cliente global.
   */
  async findProviderOnsiteStatus(
    providerId: string,
    client: Prisma.TransactionClient = prisma,
  ): Promise<ProviderOnsiteStatus | null> {
    return client.provider.findFirst({
      where: { id: providerId, deletedAt: null },
      select: {
        acceptsOnsitePayment: true,
        billing: { select: { onsitePaymentMethodReadyAt: true, commissionDebtSince: true } },
      },
    });
  },
};
