/**
 * Tipos del dominio `checkout` (cobro real de una reserva).
 *
 * El módulo cose tres piezas que ya existían por separado: la creación
 * de la reserva (`booking`), la cuenta conectada del proveedor
 * (`payments`) y el PaymentIntent de Stripe. Vive aparte de `payments`
 * porque aquel cubre el **onboarding** del proveedor y este el **cobro
 * al cliente**: distintos actores, distintos errores, distinta UI.
 */

import type { BookingStatus } from '@/lib/services/booking';

/**
 * Resultado de abrir el checkout de una reserva.
 *
 * `clientSecret` es lo único que viaja al navegador para montar Stripe
 * Elements. No es un secreto de plataforma: sólo autoriza a confirmar
 * ese PaymentIntent concreto, así que exponerlo al cliente dueño de la
 * reserva es el uso previsto por Stripe.
 */
export interface BookingCheckoutSession {
  bookingId: string;
  clientSecret: string;
  /** Importe total en céntimos, para que la UI lo pinte sin recalcular. */
  amountCents: number;
  /** Inicio del slot ya confirmado en BD (puede diferir del pedido si hubo redondeo). */
  slotStartIso: string;
  slotEndIso: string;
  /**
   * Reserva de última hora (empieza a menos de 2 h de su `createdAt`):
   * se paga ahora y no admite cancelación ni reembolso. Lo decide el
   * servidor con su propio reloj; la UI del paso de pago usa este valor
   * y no la estimación del navegador.
   */
  isLastMinute: boolean;
}

/**
 * Resultado de procesar un evento de Stripe sobre una reserva.
 *
 * `changed` distingue "he aplicado la transición" de "el evento era un
 * reintento y la reserva ya estaba en ese estado". El webhook lo usa
 * para devolver `handled` sin mentir en los logs.
 */
export interface BookingTransitionResult {
  bookingId: string;
  changed: boolean;
  /** Estado en el que queda la reserva tras procesar el evento. */
  status: string;
}

/**
 * Desenlace del reembolso asociado a una cancelación del proveedor.
 *
 *  - `issued`: Stripe aceptó el refund y el dinero vuelve al cliente.
 *  - `already_refunded`: el cargo ya estaba reembolsado (refund manual
 *    desde el dashboard, o reintento pasada la ventana de idempotencia).
 *    Es un **éxito**: el objetivo de negocio está cumplido.
 *  - `not_applicable`: no había nada que devolver (reserva `pending` o
 *    sin cargo anclado).
 *  - `failed`: Stripe falló. La cancelación sigue en pie; el dinero
 *    queda pendiente y lo resuelve soporte.
 */
export type RefundOutcome = 'issued' | 'already_refunded' | 'not_applicable' | 'failed';

/**
 * Resultado de cancelar una reserva desde el panel del proveedor
 * incluyendo el reembolso al cliente.
 *
 * `status` es siempre `cancelled`: el paso a `refunded` lo escribe el
 * webhook `charge.refunded`, que es la única fuente de verdad del
 * dinero. Devolver aquí `refunded` mentiría mientras Stripe no confirme.
 */
export interface ProviderCancellationResult {
  bookingId: string;
  /** Siempre 'cancelled': el paso a 'refunded' lo hace el webhook. */
  status: BookingStatus;
  refund: RefundOutcome;
  /** Id del refund de Stripe cuando se emitió en esta llamada. */
  stripeRefundId: string | null;
}

/**
 * Resumen de una ejecución del cron de caducidad de `pending`.
 *
 *  - `scanned`: candidatas leídas (pending más antiguas que la retención).
 *  - `expired`: canceladas en esta ejecución.
 *  - `skipped`: no se tocan a propósito: Stripe dice que el pago ya se
 *    cobró o se está procesando (lo resolverá el webhook), o la fila
 *    cambió de estado en paralelo.
 *  - `failed`: error inesperado; se reintentará en la próxima ejecución.
 */
export interface ExpirePendingSummary {
  scanned: number;
  expired: number;
  skipped: number;
  failed: number;
}

/**
 * Entrada de la cola de reembolsos fallidos que revisa soporte en
 * /admin. Se forma con `refundFailedAt != null && refundedAt == null`.
 */
export interface PendingRefundSummary {
  bookingId: string;
  /** `Provider.businessName`. */
  providerName: string;
  /** Nombre del servicio resuelto al locale `es`. */
  serviceName: string;
  clientEmail: string;
  priceCents: number;
  startAt: Date;
  cancelledAt: Date | null;
  refundFailedAt: Date;
  /** `código: mensaje` del último fallo de Stripe, sin PII. */
  refundFailureReason: string | null;
  stripePaymentIntentId: string | null;
}

/**
 * Desenlace de un reintento manual de reembolso desde admin.
 *
 *  - `succeeded`: Stripe aceptó el refund o el cargo ya estaba devuelto.
 *  - `failed`: Stripe volvió a fallar; la reserva sigue en la cola.
 *  - `not_applicable`: la reserva no tiene PaymentIntent que reembolsar.
 */
export type RetryRefundOutcome = 'succeeded' | 'failed' | 'not_applicable';

/** Resultado de `retryBookingRefund`. */
export interface RetryRefundResult {
  bookingId: string;
  refund: RetryRefundOutcome;
  /** Id del refund cuando Stripe lo devolvió en este intento. */
  stripeRefundId: string | null;
}
