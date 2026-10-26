import 'server-only';

import { prisma } from '@/lib/db/prisma';

/**
 * Campos de la reserva que necesitan el webhook y el cron de caducidad:
 * estado, PaymentIntent y lo justo para comprobar si su franja sigue
 * libre (profesional, rango y antigüedad de la retención).
 */
const CHECKOUT_BOOKING_SELECT = {
  id: true,
  status: true,
  stripePaymentIntentId: true,
  professionalId: true,
  startAt: true,
  endAt: true,
  createdAt: true,
  stripeRefundId: true,
  refundFailedAt: true,
} as const;

/** Fila de reserva tal y como la consume el dominio checkout. */
export interface CheckoutBookingRow {
  id: string;
  status: string;
  stripePaymentIntentId: string | null;
  professionalId: string;
  startAt: Date;
  endAt: Date;
  createdAt: Date;
  /** Refund emitido por nosotros (`re_…`), si lo hay. */
  stripeRefundId: string | null;
  /** Último fallo de reembolso registrado (cola de /admin). */
  refundFailedAt: Date | null;
}

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
  async findByPaymentIntentId(paymentIntentId: string): Promise<CheckoutBookingRow | null> {
    return prisma.booking.findFirst({
      where: { stripePaymentIntentId: paymentIntentId },
      select: CHECKOUT_BOOKING_SELECT,
    });
  },

  /**
   * `pending` creadas antes del corte de retención: candidatas a caducar.
   * Las más antiguas primero y con tope, para que una ejecución del cron
   * quepa holgada en el límite de duración de la función.
   */
  async findExpiredPending(cutoff: Date, limit: number): Promise<CheckoutBookingRow[]> {
    return prisma.booking.findMany({
      where: { status: 'pending', createdAt: { lt: cutoff } },
      orderBy: { createdAt: 'asc' },
      take: limit,
      select: CHECKOUT_BOOKING_SELECT,
    });
  },

  /**
   * Confirma una reserva **solo si sigue en `pending`**.
   *
   * Condicional a propósito (`updateMany` con el estado en el `where`):
   * el webhook, el cron y la cancelación del proveedor pueden tocar la
   * misma fila a la vez, y un `update` a ciegas podría resucitar una
   * reserva recién cancelada.
   *
   * @returns `true` si esta llamada aplicó la confirmación.
   */
  async confirmIfPending(bookingId: string): Promise<boolean> {
    const { count } = await prisma.booking.updateMany({
      where: { id: bookingId, status: 'pending' },
      data: { status: 'confirmed' },
    });
    return count > 0;
  },

  /** Relectura de la fila tras perder una escritura condicional. */
  async findCheckoutRow(bookingId: string): Promise<CheckoutBookingRow | null> {
    return prisma.booking.findUnique({
      where: { id: bookingId },
      select: CHECKOUT_BOOKING_SELECT,
    });
  },

  /**
   * Cancela una reserva **solo si sigue en `pending`**. Mismo patrón
   * condicional que `confirmIfPending`.
   *
   * @returns `true` si esta llamada aplicó la cancelación.
   */
  async cancelIfPending(bookingId: string, cancelledAt: Date): Promise<boolean> {
    const { count } = await prisma.booking.updateMany({
      where: { id: bookingId, status: 'pending' },
      data: { status: 'cancelled', cancelledAt },
    });
    return count > 0;
  },
};
