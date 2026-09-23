import 'server-only';

import { prisma } from '@/lib/db/prisma';

/**
 * Repositorio del dominio `plans`.
 *
 * Capa fina sobre Prisma: solo lectura, sin reglas de negocio. La
 * decisión de qué hacer cuando no hay filas vive en el service.
 */
export const plansRepository = {
  /**
   * Devuelve el catálogo completo ordenado por cuota ascendente.
   *
   * Ordenamos por `monthlyPriceCents` y no por `tier` porque el orden
   * comercial que espera la landing (gratis → premium) es justamente
   * el de precio creciente, y así un tier nuevo se coloca solo.
   */
  async findAllOrderedByPrice() {
    return prisma.plan.findMany({
      select: {
        tier: true,
        monthlyPriceCents: true,
        commissionRateBps: true,
        maxServices: true,
      },
      orderBy: { monthlyPriceCents: 'asc' },
    });
  },
};
