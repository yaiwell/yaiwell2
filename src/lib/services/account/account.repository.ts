import 'server-only';

import { prisma } from '@/lib/db/prisma';
// Ruta directa: solo hace falta la condición, no el servicio de reembolsos.
import { PENDING_REFUND_WHERE } from '@/lib/services/checkout/checkout.refund.repository';

/**
 * Lecturas de la gestión de datos de la cuenta. Sin reglas de negocio.
 */
export const accountRepository = {
  /** Reservas que todavía pueden generar avisos o cobros al cliente. */
  countOpenBookings(userId: string) {
    return prisma.booking.count({
      where: { clientId: userId, status: { in: ['pending', 'confirmed'] } },
    });
  },

  /**
   * Reembolsos sin terminar: fallidos en la cola de soporte o ya emitidos sin
   * confirmar. Soporte aún podría tener que contactar con la persona.
   */
  countOpenRefunds(userId: string) {
    return prisma.booking.count({
      where: {
        clientId: userId,
        OR: [PENDING_REFUND_WHERE, { stripeRefundId: { not: null }, refundedAt: null }],
      },
    });
  },

  /** Negocios vivos de los que la cuenta es titular. */
  countOwnedProviders(userId: string) {
    return prisma.provider.count({ where: { userId, deletedAt: null } });
  },

  /** Todo lo que se guarda de la persona, para su copia de datos. */
  findExportRows(userId: string) {
    return Promise.all([
      prisma.booking.findMany({
        where: { clientId: userId },
        orderBy: { startAt: 'desc' },
        include: {
          provider: { select: { businessName: true } },
          service: { select: { name: true } },
          professional: { select: { name: true } },
        },
      }),
      prisma.review.findMany({
        where: { authorId: userId },
        orderBy: { createdAt: 'desc' },
        include: { provider: { select: { businessName: true } } },
      }),
      prisma.clientSanction.findMany({
        where: { userId },
        orderBy: { occurredAt: 'desc' },
      }),
      prisma.provider.findMany({
        where: { userId },
        orderBy: { createdAt: 'asc' },
        select: {
          businessName: true,
          type: true,
          vatNumber: true,
          description: true,
          address: true,
          photos: true,
          createdAt: true,
          contact: { select: { phone: true, email: true } },
          professionals: {
            where: { deletedAt: null },
            select: { name: true, bio: true, photo: true },
          },
          services: {
            where: { deletedAt: null },
            select: { name: true, description: true, durationMinutes: true, priceCents: true },
          },
        },
      }),
    ]);
  },
};
