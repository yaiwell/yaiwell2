import 'server-only';

import type { BookingStatus } from '@prisma/client';

import { prisma } from '@/lib/db/prisma';

/**
 * Repositorio del reembolso por incidencia del centro. Sin reglas de negocio:
 * las decide `checkout.incident-refund.eligibility`.
 */

/** Lo que necesita el reembolso por incidencia para decidir y resumir. */
export interface IncidentRefundRow {
  id: string;
  status: BookingStatus;
  paymentMode: 'online' | 'onsite';
  priceCents: number;
  startAt: Date;
  endAt: Date;
  completedAt: Date | null;
  providerId: string;
  professionalId: string;
  slotOfferId: string | null;
  stripePaymentIntentId: string | null;
  stripeRefundId: string | null;
  refundedAt: Date | null;
  refundFailedAt: Date | null;
  refundDismissedAt: Date | null;
  incidentRefundAt: Date | null;
  incidentRefundBy: string | null;
  incidentRefundNote: string | null;
  provider: { businessName: string };
  service: { name: unknown };
}

/** Marca de auditoría que se escribe al cancelar. */
export interface IncidentRefundMark {
  at: Date;
  /** `User.id` interno del admin. */
  by: string;
  note: string;
}

/**
 * Reembolso por incidencia a medias: cancelada por soporte y sin refund, fallo
 * en la cola ni confirmación. Es lo que deja una caída entre BD y Stripe, o un
 * fallo que no se pudo grabar (`failed_unrecorded`).
 */
export const UNFINISHED_INCIDENT_REFUND_WHERE = {
  incidentRefundAt: { not: null },
  status: 'cancelled',
  stripeRefundId: null,
  refundFailedAt: null,
  refundedAt: null,
} as const;

export const incidentRefundRepository = {
  /** Lectura completa, con lo que pinta admin. */
  async findRow(bookingId: string): Promise<IncidentRefundRow | null> {
    return prisma.booking.findUnique({
      where: { id: bookingId },
      select: {
        id: true,
        status: true,
        paymentMode: true,
        priceCents: true,
        startAt: true,
        endAt: true,
        completedAt: true,
        providerId: true,
        professionalId: true,
        slotOfferId: true,
        stripePaymentIntentId: true,
        stripeRefundId: true,
        refundedAt: true,
        refundFailedAt: true,
        refundDismissedAt: true,
        incidentRefundAt: true,
        incidentRefundBy: true,
        incidentRefundNote: true,
        provider: { select: { businessName: true } },
        service: { select: { name: true } },
      },
    });
  },

  /**
   * Cancela la reserva por incidencia **solo si sigue en el estado leído** y
   * sin reembolso. Es la barrera contra una doble ejecución: de dos, solo una
   * cambia la fila y llega a Stripe. La marca va en la misma escritura: sin
   * ella la reserva cancelada se podría liberar con descuento, y una caída
   * antes de llamar a Stripe no se podría reanudar.
   *
   * @returns `true` si esta llamada aplicó la cancelación.
   */
  async cancelForIncident(
    bookingId: string,
    from: 'confirmed' | 'completed',
    mark: IncidentRefundMark,
  ): Promise<boolean> {
    const { count } = await prisma.booking.updateMany({
      where: {
        id: bookingId,
        status: from,
        paymentMode: 'online',
        refundedAt: null,
        stripeRefundId: null,
        incidentRefundAt: null,
      },
      data: {
        status: 'cancelled',
        cancelledAt: mark.at,
        incidentRefundAt: mark.at,
        incidentRefundBy: mark.by,
        incidentRefundNote: mark.note,
      },
    });
    return count > 0;
  },

  /** A medias y marcadas antes de `markedBefore`, las más antiguas primero. */
  async findUnfinished(markedBefore: Date) {
    return prisma.booking.findMany({
      where: {
        ...UNFINISHED_INCIDENT_REFUND_WHERE,
        incidentRefundAt: { not: null, lte: markedBefore },
      },
      orderBy: { incidentRefundAt: 'asc' },
      select: {
        id: true,
        priceCents: true,
        startAt: true,
        incidentRefundAt: true,
        provider: { select: { businessName: true } },
        service: { select: { name: true } },
      },
    });
  },

  /** ¿Quedó grabado el fallo en la cola de /admin? */
  async hasRecordedFailure(bookingId: string): Promise<boolean> {
    const row = await prisma.booking.findUnique({
      where: { id: bookingId },
      select: { refundFailedAt: true },
    });
    return Boolean(row?.refundFailedAt);
  },
};
