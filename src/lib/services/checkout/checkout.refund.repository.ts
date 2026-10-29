import 'server-only';

import { prisma } from '@/lib/db/prisma';

/**
 * Repositorio de la auditoría de reembolsos de una reserva.
 *
 * Escribe y lee las columnas `stripeRefundId`, `refundedAt`,
 * `refundFailedAt` y `refundFailureReason` (migración 9). Va aparte de
 * `checkout.repository` para que cada fichero mantenga una sola
 * responsabilidad: aquel ancla el cobro, este registra la devolución.
 */

/** Fila de la cola de reembolsos fallidos, con los joins que pinta admin. */
export interface PendingRefundRow {
  id: string;
  priceCents: number;
  startAt: Date;
  cancelledAt: Date | null;
  refundFailedAt: Date | null;
  refundFailureReason: string | null;
  stripePaymentIntentId: string | null;
  provider: { businessName: string };
  service: { name: unknown };
  client: { email: string };
}

/** Condición única de "reembolso pendiente de soporte". */
const PENDING_REFUND_WHERE = { refundFailedAt: { not: null }, refundedAt: null } as const;

export const refundRepository = {
  /**
   * Registra un reembolso aceptado por Stripe y saca la reserva de la
   * cola de fallidos (si estaba).
   */
  async recordIssued(bookingId: string, stripeRefundId: string): Promise<void> {
    await prisma.booking.update({
      where: { id: bookingId },
      data: { stripeRefundId, refundFailedAt: null, refundFailureReason: null },
    });
  },

  /**
   * Saca la reserva de la cola cuando el dinero ya estaba devuelto
   * (`charge_already_refunded`) y no conocemos el id del refund.
   */
  async clearFailure(bookingId: string): Promise<void> {
    await prisma.booking.update({
      where: { id: bookingId },
      data: { refundFailedAt: null, refundFailureReason: null },
    });
  },

  /** Mete (o mantiene) la reserva en la cola de reembolsos fallidos. */
  async recordFailed(bookingId: string, failedAt: Date, reason: string): Promise<void> {
    await prisma.booking.update({
      where: { id: bookingId },
      data: { refundFailedAt: failedAt, refundFailureReason: reason },
    });
  },

  /**
   * Registra un refund que Stripe aceptó y después falló (asíncrono).
   *
   * Limpia `refundedAt` porque `charge.refunded` ya pudo haberlo puesto
   * al crearse el refund: sin limpiarlo la reserva nunca entraría en la
   * cola. Si la fila estaba en `refunded`, vuelve a `cancelled`, que es
   * la verdad: cancelada y con el dinero aún sin devolver.
   */
  async recordAsyncFailure(bookingId: string, failedAt: Date, reason: string): Promise<void> {
    const failure = { refundFailedAt: failedAt, refundFailureReason: reason, refundedAt: null };
    await prisma.booking.updateMany({
      where: { id: bookingId, status: 'refunded' },
      data: { ...failure, status: 'cancelled' },
    });
    await prisma.booking.updateMany({
      where: { id: bookingId, status: { not: 'refunded' } },
      data: failure,
    });
  },

  /** Localiza la reserva de un refund por su id de Stripe. */
  async findByStripeRefundId(stripeRefundId: string): Promise<{
    id: string;
    status: string;
    stripeRefundId: string | null;
    refundFailedAt: Date | null;
  } | null> {
    return prisma.booking.findUnique({
      where: { stripeRefundId },
      select: { id: true, status: true, stripeRefundId: true, refundFailedAt: true },
    });
  },

  /** Cola de reembolsos fallidos, más antiguos primero. */
  async findPending(): Promise<PendingRefundRow[]> {
    return prisma.booking.findMany({
      where: PENDING_REFUND_WHERE,
      orderBy: { refundFailedAt: 'asc' },
      select: {
        id: true,
        priceCents: true,
        startAt: true,
        cancelledAt: true,
        refundFailedAt: true,
        refundFailureReason: true,
        stripePaymentIntentId: true,
        provider: { select: { businessName: true } },
        service: { select: { name: true } },
        client: { select: { email: true } },
      },
    });
  },

  /** Lo mínimo para decidir si una reserva puede reintentar su refund. */
  async findRefundState(bookingId: string): Promise<{
    id: string;
    status: string;
    stripePaymentIntentId: string | null;
    refundFailedAt: Date | null;
    refundedAt: Date | null;
  } | null> {
    return prisma.booking.findUnique({
      where: { id: bookingId },
      select: {
        id: true,
        status: true,
        stripePaymentIntentId: true,
        refundFailedAt: true,
        refundedAt: true,
      },
    });
  },
};
