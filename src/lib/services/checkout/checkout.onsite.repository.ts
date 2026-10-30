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

  /**
   * Reservas futuras del cliente con pago en el local que aún cuentan
   * para el tope (`MAX_ACTIVE_ONSITE_BOOKINGS`): `confirmed` y con inicio
   * posterior a `now`. Las pasadas, canceladas u online no cuentan.
   * Usa el índice `(clientId, startAt)`.
   *
   * @param client — transacción en curso para contar junto a la creación.
   */
  async countActiveOnsiteBookings(
    clientId: string,
    now: Date,
    client: Prisma.TransactionClient = prisma,
  ): Promise<number> {
    return client.booking.count({
      where: { clientId, paymentMode: 'onsite', status: 'confirmed', startAt: { gt: now } },
    });
  },

  /**
   * Serializa hasta el fin de la transacción las reservas en el local de
   * un mismo cliente: dos peticiones simultáneas con profesionales
   * distintos no comparten el bloqueo por profesional, y sin esto las
   * dos verían 2 reservas y acabarían en 4.
   *
   * Prefijo propio para no compartir clave con `lockProfessional`. Se
   * toma siempre después del bloqueo del profesional y nunca al revés,
   * así que no hay ciclo de esperas posible.
   */
  async lockClientOnsite(tx: Prisma.TransactionClient, clientId: string): Promise<void> {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`onsite-client:${clientId}`}))`;
  },
};
