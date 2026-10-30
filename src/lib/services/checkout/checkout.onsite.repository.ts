import 'server-only';

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
   */
  async findProviderOnsiteStatus(providerId: string): Promise<ProviderOnsiteStatus | null> {
    return prisma.provider.findFirst({
      where: { id: providerId, deletedAt: null },
      select: {
        acceptsOnsitePayment: true,
        billing: { select: { onsitePaymentMethodReadyAt: true, commissionDebtSince: true } },
      },
    });
  },
};
