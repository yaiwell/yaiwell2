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

/**
 * Condición única de "reembolso pendiente de soporte": falló, no se ha
 * devuelto y nadie lo ha descartado a mano.
 */
const PENDING_REFUND_WHERE = {
  refundFailedAt: { not: null },
  refundedAt: null,
  refundDismissedAt: null,
} as const;

/** Auditoría de un descarte manual de la cola. */
export interface RefundDismissal {
  dismissedAt: Date;
  /** `User.id` interno del admin que descarta. */
  dismissedBy: string;
  reason: string;
}

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

  /**
   * Mete (o mantiene) la reserva en la cola de reembolsos fallidos.
   *
   * Un fallo nuevo reabre una entrada descartada: si Stripe vuelve a
   * fallar es que sí hay dinero en juego. Solo se limpia
   * `refundDismissedAt` (lo que la saca de la cola); quién la descartó y
   * por qué se conservan como rastro del último descarte.
   */
  async recordFailed(bookingId: string, failedAt: Date, reason: string): Promise<void> {
    await prisma.booking.update({
      where: { id: bookingId },
      data: { refundFailedAt: failedAt, refundFailureReason: reason, refundDismissedAt: null },
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
    // Como en `recordFailed`, un fallo nuevo reabre un descarte previo.
    const failure = {
      refundFailedAt: failedAt,
      refundFailureReason: reason,
      refundedAt: null,
      refundDismissedAt: null,
    };
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

  /** Lo mínimo para decidir si una reserva puede reintentar o descartar su refund. */
  async findRefundState(bookingId: string): Promise<{
    id: string;
    status: string;
    stripePaymentIntentId: string | null;
    refundFailedAt: Date | null;
    refundedAt: Date | null;
    refundDismissedAt: Date | null;
  } | null> {
    return prisma.booking.findUnique({
      where: { id: bookingId },
      select: {
        id: true,
        status: true,
        stripePaymentIntentId: true,
        refundFailedAt: true,
        refundedAt: true,
        refundDismissedAt: true,
      },
    });
  },

  /**
   * Descarta la entrada de la cola **solo si sigue siendo descartable**
   * (cancelada, en cola y sin devolver). Condicional para que un
   * `charge.refunded` o un reintento en paralelo no queden tapados por
   * un descarte basado en una lectura vieja.
   *
   * @returns `true` si esta llamada aplicó el descarte.
   */
  async dismissIfQueued(bookingId: string, dismissal: RefundDismissal): Promise<boolean> {
    const { count } = await prisma.booking.updateMany({
      where: { id: bookingId, status: 'cancelled', ...PENDING_REFUND_WHERE },
      data: {
        refundDismissedAt: dismissal.dismissedAt,
        refundDismissedBy: dismissal.dismissedBy,
        refundDismissReason: dismissal.reason,
      },
    });
    return count > 0;
  },
};
