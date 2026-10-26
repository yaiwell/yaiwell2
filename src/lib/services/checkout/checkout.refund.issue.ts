import 'server-only';

import type Stripe from 'stripe';

import { isSentryEnabled } from '@/lib/integrations/sentry';
import { getStripeClient } from '@/lib/integrations/stripe';

import { RefundFailedError } from './checkout.errors';
import { refundRepository } from './checkout.refund.repository';
import type { RefundOutcome } from './checkout.types';

/**
 * Emisión única de reembolsos íntegros de una reserva.
 *
 * Todos los caminos que devuelven dinero pasan por aquí: cancelación del
 * proveedor, pago que llega tarde sobre una reserva muerta y reintento
 * manual desde /admin. Así la clave de idempotencia, los parámetros de
 * Connect y el registro en la cola de fallidos no pueden divergir.
 */

/** Código de Stripe cuando el cargo ya estaba reembolsado: es un éxito. */
const STRIPE_ALREADY_REFUNDED_CODE = 'charge_already_refunded';

/** Límite del motivo guardado en BD: suficiente para código + mensaje. */
const FAILURE_REASON_MAX_LENGTH = 500;

/** Desenlace de una emisión (nunca `not_applicable`: eso lo decide el caller). */
export interface IssuedRefund {
  outcome: Exclude<RefundOutcome, 'not_applicable'>;
  stripeRefundId: string | null;
}

/**
 * Clave de idempotencia de los caminos **automáticos** de reembolso
 * (cancelación del proveedor, pago tardío). Es la misma en todos: un
 * webhook reentregado o una carrera entre cancelación y pago nunca emite
 * un segundo refund mientras la clave siga viva en Stripe (24 h).
 *
 * El reintento manual de admin usa otra clave por intento (ver
 * `checkout.refund-queue.service.ts`).
 */
export function bookingRefundIdempotencyKey(bookingId: string): string {
  return `booking_refund_${bookingId}`;
}

/** Opciones de emisión; los defaults cubren los caminos automáticos. */
export interface IssueRefundOptions {
  /** Instante del intento; inyectable para tests. */
  now?: Date;
  /** Clave de idempotencia; por defecto `bookingRefundIdempotencyKey`. */
  idempotencyKey?: string;
}

/**
 * Emite el reembolso íntegro de una reserva y registra el desenlace.
 *
 * `reverse_transfer: true` es obligatorio: cobramos con destination
 * charges, el neto ya viajó a la cuenta conectada del centro y sin
 * revertir esa transferencia la plataforma pagaría el reembolso de su
 * bolsillo. `refund_application_fee` devuelve además nuestra comisión:
 * si el servicio no se presta, la plataforma no cobra. Si el centro ya
 * cobró su payout, la reversión puede dejarle saldo negativo; es
 * correcto y Stripe lo recupera de su volumen futuro.
 *
 * Nunca lanza: los callers (cancelación ya comprometida, webhook) no
 * pueden hacer nada útil con una excepción. Un fallo deja la reserva en
 * la cola de /admin (`refundFailedAt`) y se reporta a Sentry.
 *
 * @param bookingId — reserva cuyo cobro se devuelve.
 * @param paymentIntentId — PaymentIntent anclado a la reserva.
 * @param options — instante y clave de idempotencia (ver `IssueRefundOptions`).
 */
export async function issueBookingRefund(
  bookingId: string,
  paymentIntentId: string,
  options: IssueRefundOptions = {},
): Promise<IssuedRefund> {
  const now = options.now ?? new Date();
  const idempotencyKey = options.idempotencyKey ?? bookingRefundIdempotencyKey(bookingId);
  const stripe = getStripeClient();

  let refund: Stripe.Refund;
  try {
    refund = await stripe.refunds.create(
      { payment_intent: paymentIntentId, refund_application_fee: true, reverse_transfer: true },
      { idempotencyKey },
    );
  } catch (err) {
    if (isAlreadyRefundedError(err)) {
      // Alguien devolvió el dinero a mano desde el dashboard, o se
      // reintentó pasada la vida de la clave. El objetivo de negocio
      // está cumplido: tratarlo como fallo dejaría a soporte
      // reintentando en bucle algo que ya no tiene efecto.
      await recordSafely(bookingId, () => refundRepository.clearFailure(bookingId));
      return { outcome: 'already_refunded', stripeRefundId: null };
    }

    reportRefundFailure(bookingId, err);
    await recordSafely(bookingId, () =>
      refundRepository.recordFailed(bookingId, now, describeStripeFailure(err)),
    );
    return { outcome: 'failed', stripeRefundId: null };
  }

  if (refund.status === 'failed') {
    // Stripe puede devolver el refund ya fallido (p. ej. tarjeta
    // cancelada). No es un éxito: no limpiamos la cola, la alimentamos.
    const reason = `refund_failed: ${refund.failure_reason ?? 'unknown'}`;
    reportRefundFailure(bookingId, reason);
    await recordSafely(bookingId, () => refundRepository.recordFailed(bookingId, now, reason));
    return { outcome: 'failed', stripeRefundId: null };
  }

  await recordSafely(bookingId, () => refundRepository.recordIssued(bookingId, refund.id));
  return { outcome: 'issued', stripeRefundId: refund.id };
}

/**
 * Detecta `charge_already_refunded`. El SDK lo expone en `code`, pero
 * los errores reconstruidos desde la respuesta cruda lo dejan en
 * `raw.code`: miramos ambos.
 */
function isAlreadyRefundedError(err: unknown): boolean {
  const { code, rawCode } = extractCodes(err);
  return code === STRIPE_ALREADY_REFUNDED_CODE || rawCode === STRIPE_ALREADY_REFUNDED_CODE;
}

function extractCodes(err: unknown): { code: unknown; rawCode: unknown } {
  if (typeof err !== 'object' || err === null) {
    return { code: undefined, rawCode: undefined };
  }
  const candidate = err as { code?: unknown; raw?: { code?: unknown } | null };
  return { code: candidate.code, rawCode: candidate.raw?.code };
}

/** Solo el código del error de Stripe (o `unknown_error`). */
export function describeStripeCode(err: unknown): string {
  const { code, rawCode } = extractCodes(err);
  if (typeof code === 'string') return code;
  return typeof rawCode === 'string' ? rawCode : 'unknown_error';
}

/**
 * Motivo técnico legible para soporte: `código: mensaje`.
 *
 * Solo código y mensaje de Stripe, que describen el estado del cargo o
 * de la cuenta (saldo insuficiente, cargo disputado…), nunca datos de
 * tarjeta ni del cliente. Truncado para no guardar trazas enormes.
 */
export function describeStripeFailure(err: unknown): string {
  const message = err instanceof Error ? err.message : String(err);
  return `${describeStripeCode(err)}: ${message}`.slice(0, FAILURE_REASON_MAX_LENGTH);
}

/**
 * Ejecuta una escritura de auditoría sin dejar que su fallo tumbe el
 * flujo: el dinero ya se movió (o no) en Stripe y eso no se deshace.
 */
async function recordSafely(bookingId: string, write: () => Promise<void>): Promise<void> {
  try {
    await write();
  } catch (err) {
    console.error('[checkout/refund] failed to record refund outcome:', bookingId, err);
  }
}

/**
 * Reporta un reembolso fallido. Es dinero de un cliente sin devolver:
 * necesita alerta, no solo log. Sentry se importa en diferido y solo con
 * DSN para no arrastrar el SDK en tests ni en local.
 */
function reportRefundFailure(bookingId: string, cause: unknown): void {
  const error = new RefundFailedError(
    `Stripe rechazó el reembolso de la reserva ${bookingId}.`,
    cause,
  );
  // Log técnico en inglés y sin el mensaje del error de dominio: solo el
  // código de Stripe, que es lo que soporte necesita para diagnosticar.
  console.error('[checkout/refund] Stripe refund failed:', bookingId, describeStripeCode(cause));

  if (!isSentryEnabled()) {
    return;
  }
  void import('@sentry/nextjs')
    .then((Sentry) => {
      Sentry.captureException(error, { tags: { domain: 'checkout', bookingId } });
    })
    .catch(() => {
      // Sin Sentry solo queda el console.error: la telemetría no debe
      // romper el flujo de cancelación ni el webhook.
    });
}
