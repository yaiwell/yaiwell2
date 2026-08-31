import 'server-only';

import { prisma } from '@/lib/db/prisma';

/**
 * Repositorio del dominio `checkout`.
 *
 * Capa fina sobre Prisma. Las transiciones de estado de la reserva las
 * hace `bookingRepository.updateStatus` — aquí sólo vive lo específico
 * del cobro: leer la cuenta de destino y anclar el PaymentIntent.
 */
export const checkoutRepository = {
  /**
   * Cuenta Stripe conectada a la que debe transferirse el importe.
   * Devuelve `null` si el proveedor no existe o está soft-deleted.
   */
  async findPayoutAccount(providerId: string): Promise<{ stripeAccountId: string | null } | null> {
    return prisma.provider.findFirst({
      where: { id: providerId, deletedAt: null },
      select: { stripeAccountId: true },
    });
  },

  /**
   * Ancla el PaymentIntent a la reserva. Se hace después de crear el
   * intent porque su id lo genera Stripe; hasta entonces la reserva
   * vive con `stripePaymentIntentId = null`.
   */
  async attachPaymentIntent(bookingId: string, paymentIntentId: string): Promise<void> {
    await prisma.booking.update({
      where: { id: bookingId },
      data: { stripePaymentIntentId: paymentIntentId },
    });
  },

  /**
   * Localiza una reserva por el id del PaymentIntent. Ruta de respaldo
   * para eventos de Stripe que llegan sin `bookingId` en metadata.
   *
   * Sin índice dedicado: el camino normal del webhook es por metadata
   * y esta query sólo corre en el caso degradado.
   */
  async findByPaymentIntentId(
    paymentIntentId: string,
  ): Promise<{ id: string; status: string; stripePaymentIntentId: string | null } | null> {
    return prisma.booking.findFirst({
      where: { stripePaymentIntentId: paymentIntentId },
      select: { id: true, status: true, stripePaymentIntentId: true },
    });
  },
};
