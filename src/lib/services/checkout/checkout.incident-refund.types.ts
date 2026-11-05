import type { BookingStatus } from '@/lib/services/booking';

import type { IncidentRefundIneligibleReason } from './checkout.incident-refund.errors';

/**
 * Tipos del reembolso por incidencia del centro (/admin/reembolsos).
 */

/**
 * Si una reserva admite el reembolso y, si no, por qué.
 *
 *  - `mode: 'new'`: reserva viva; se cancela y se reembolsa.
 *  - `mode: 'resume'`: ya cancelada por incidencia, pero el reembolso no llegó
 *    a completarse (caída entre BD y Stripe); solo falta reanudarlo.
 */
export type IncidentRefundEligibility =
  | { eligible: true; mode: 'new' | 'resume' }
  | { eligible: false; reason: IncidentRefundIneligibleReason };

/** Resumen que ve soporte antes de confirmar. */
export interface IncidentRefundPreview {
  bookingId: string;
  /** `Provider.businessName`. */
  providerName: string;
  /** Nombre del servicio resuelto al locale `es`, como la cola de /admin. */
  serviceName: string;
  startAt: Date;
  priceCents: number;
  status: BookingStatus;
  eligibility: IncidentRefundEligibility;
  /** Ya devuelta y marcada por incidencia: soporte puede repetir los avisos. */
  canResendNotices: boolean;
}

/** Reembolso por incidencia a medias, para la lista de /admin/reembolsos. */
export interface UnfinishedIncidentRefund {
  bookingId: string;
  providerName: string;
  /** Nombre del servicio resuelto al locale `es`, como la cola de /admin. */
  serviceName: string;
  priceCents: number;
  startAt: Date;
  incidentRefundAt: Date;
}

/** Estados desde los que se puede aplicar este reembolso. */
export type IncidentRefundFromStatus = 'confirmed' | 'completed';

/**
 * Qué ha pasado con la franja:
 *  - `blocked`: la cita no ha empezado y la agenda queda bloqueada.
 *  - `not_blocked`: no ha empezado, pero no se pudo bloquear; sigue reservable.
 *  - `taken`: otra reserva activa ocupa ya esa hora con ese profesional.
 *  - `not_applicable`: la cita ya empezó o pasó.
 */
export type IncidentSlotState = 'blocked' | 'not_blocked' | 'taken' | 'not_applicable';

/**
 * Desenlace del reembolso.
 *
 *  - `replayed: false`: esta llamada pidió el refund; el caller debe avisar a
 *    cliente y centro. `queued` dice si un fallo quedó grabado en la cola: si
 *    no (`false` con `refund: 'failed'`), la reserva se puede reanudar.
 *  - `replayed: true`: el dinero ya estaba devuelto y nada ha cambiado. Con
 *    `notice` (reserva marcada por incidencia) el caller repite los avisos, con
 *    las mismas claves: pudo caerse justo antes de enviarlos.
 */
export type IncidentRefundResult =
  | {
      replayed: false;
      bookingId: string;
      previousStatus: IncidentRefundFromStatus;
      refund: 'issued' | 'already_refunded' | 'failed';
      stripeRefundId: string | null;
      queued: boolean;
      slot: IncidentSlotState;
    }
  | {
      replayed: true;
      bookingId: string;
      refund: 'already_refunded';
      stripeRefundId: string | null;
      notice: { previousStatus: IncidentRefundFromStatus; slot: IncidentSlotState } | null;
    };
