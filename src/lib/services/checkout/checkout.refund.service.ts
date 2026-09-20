import 'server-only';

import type Stripe from 'stripe';

import { isSentryEnabled } from '@/lib/integrations/sentry';
import { getStripeClient } from '@/lib/integrations/stripe';
import { bookingRepository, cancelBookingByProvider } from '@/lib/services/booking';

import { RefundFailedError } from './checkout.errors';
import type { ProviderCancellationResult } from './checkout.types';
import { cancelBookingWithRefundSchema } from './checkout.validation';

/**
 * Cancelación de una reserva por el proveedor con devolución íntegra
 * del dinero al cliente (§4.bis de CLAUDE.md).
 *
 * `booking.service` sólo sabe de estados; el dinero vive aquí, en el
 * módulo que ya conoce Stripe Connect. Así el dominio `booking` sigue
 * siendo testeable sin SDK de pagos.
 */

/**
 * Código de error de Stripe cuando el cargo ya estaba reembolsado.
 * Lo tratamos como éxito, no como fallo: ver `issueRefund`.
 */
const STRIPE_ALREADY_REFUNDED_CODE = 'charge_already_refunded';

export type { ProviderCancellationResult } from './checkout.types';

/**
 * Cancela una reserva desde el panel del proveedor y devuelve el
 * importe íntegro al cliente.
 *
 * **Orden BD → Stripe, sin rollback.** La cancelación es *irreversible*
 * en términos de negocio: al aplicarla se libera el hueco y otro cliente
 * puede cogerlo en el mismo segundo, así que deshacerla no es una opción
 * real. El reembolso, en cambio, es *reintentable*: va con idempotency
 * key, de modo que repetirlo no duplica dinero. Entre un paso
 * irreversible y uno reintentable, se compromete primero el
 * irreversible; si el segundo falla, queda una cancelación correcta con
 * un reembolso pendiente, que soporte puede completar. Al revés
 * tendríamos dinero devuelto sobre una reserva todavía viva.
 *
 * Las reglas de negocio (titularidad, ventana de 2 h, estado cancelable)
 * las aplica `cancelBookingByProvider` y sus errores se propagan tal
 * cual: ocurren **antes** de tocar dinero.
 *
 * @param input — payload crudo con el `bookingId` (validado con Zod).
 * @param providerUserId — `User.id` del proveedor autenticado.
 * @returns el desenlace de la cancelación y del reembolso.
 * @throws BookingNotFoundError — la reserva no existe.
 * @throws UnauthorizedCancellationError — el usuario no es el dueño.
 * @throws BookingNotCancellableError — el estado actual no admite cancelación.
 * @throws BookingTooLateToCancelError — faltan menos de 2 h para el inicio.
 */
export async function cancelBookingByProviderWithRefund(
  input: unknown,
  providerUserId: string,
): Promise<ProviderCancellationResult> {
  const { bookingId } = cancelBookingWithRefundSchema.parse(input);

  // Foto del estado ANTES de cancelar. Una vez la fila dice `cancelled`
  // ya no se puede saber si el dinero llegó a cobrarse, y `pending` con
  // `stripePaymentIntentId` es un caso real: el checkout ancla el intent
  // al crear la reserva, mucho antes de que el cliente pague.
  const snapshot = await bookingRepository.findById(bookingId);

  await cancelBookingByProvider({ bookingId }, providerUserId);

  const paymentIntentId = snapshot?.stripePaymentIntentId ?? null;
  if (!snapshot || snapshot.status === 'pending' || !paymentIntentId) {
    // Nunca hubo cobro confirmado: cancelar se limita a liberar el hueco.
    return {
      bookingId,
      status: 'cancelled',
      refund: 'not_applicable',
      stripeRefundId: null,
    };
  }

  return issueRefund(bookingId, paymentIntentId);
}

/**
 * Emite el reembolso íntegro contra Stripe.
 *
 * `reverse_transfer: true` es obligatorio y es el punto crítico de todo
 * el flujo. Cobramos con **destination charges**: el neto ya viajó a la
 * cuenta conectada del centro en el momento del pago. `refund_application_fee`
 * por sí solo devolvería únicamente *nuestra comisión*, y la plataforma
 * acabaría pagando de su bolsillo el payout que ya se llevó el
 * proveedor. Con `reverse_transfer` Stripe revierte además esa
 * transferencia, que es de donde sale el grueso del dinero devuelto.
 *
 * Efecto secundario asumido: si el proveedor ya cobró su payout, la
 * reversión puede dejarle **saldo negativo** en Stripe. Es correcto —
 * el servicio no se prestó — y Stripe lo recupera del volumen futuro
 * de ese mismo centro.
 *
 * Nunca lanza: la cancelación ya está comprometida y el caller no puede
 * hacer nada útil con una excepción aquí.
 */
async function issueRefund(
  bookingId: string,
  paymentIntentId: string,
): Promise<ProviderCancellationResult> {
  const stripe = getStripeClient();

  try {
    const refund: Stripe.Refund = await stripe.refunds.create(
      {
        payment_intent: paymentIntentId,
        // Recuperamos también nuestra comisión: si el servicio no se
        // presta, la plataforma no cobra.
        refund_application_fee: true,
        reverse_transfer: true,
      },
      // Misma familia de claves que `booking_checkout_${bookingId}`: un
      // doble click en "Cancelar" no emite dos reembolsos.
      { idempotencyKey: `booking_refund_${bookingId}` },
    );

    return { bookingId, status: 'cancelled', refund: 'issued', stripeRefundId: refund.id };
  } catch (err) {
    if (isAlreadyRefundedError(err)) {
      // El dinero ya está devuelto: alguien reembolsó a mano desde el
      // dashboard, o se reintentó pasadas las 24 h de vida de la
      // idempotency key. El objetivo de negocio está cumplido, así que
      // es un éxito. Tratarlo como fallo llevaría al proveedor a
      // reintentar en bucle una operación que ya no tiene efecto.
      return {
        bookingId,
        status: 'cancelled',
        refund: 'already_refunded',
        stripeRefundId: null,
      };
    }

    reportRefundFailure(bookingId, err);
    return { bookingId, status: 'cancelled', refund: 'failed', stripeRefundId: null };
  }
}

/**
 * Detecta el `charge_already_refunded` de Stripe.
 *
 * El SDK lo expone en `error.code`, pero los errores reconstruidos
 * desde la respuesta cruda lo dejan en `error.raw.code`. Miramos ambos
 * sin asumir la forma exacta del objeto.
 */
function isAlreadyRefundedError(err: unknown): boolean {
  if (typeof err !== 'object' || err === null) {
    return false;
  }
  const candidate = err as { code?: unknown; raw?: { code?: unknown } | null };
  return (
    candidate.code === STRIPE_ALREADY_REFUNDED_CODE ||
    candidate.raw?.code === STRIPE_ALREADY_REFUNDED_CODE
  );
}

/**
 * Registra un reembolso fallido.
 *
 * Es dinero de un cliente que no se ha devuelto: necesita alerta, no
 * sólo una línea de log. Importamos Sentry de forma diferida y sólo con
 * DSN configurado para no arrastrar el SDK en entornos sin telemetría
 * (tests, desarrollo local).
 */
function reportRefundFailure(bookingId: string, cause: unknown): void {
  const error = new RefundFailedError(
    `Stripe rechazó el reembolso de la reserva ${bookingId}.`,
    cause,
  );
  console.error('[checkout/refund]', error.message, cause);

  if (!isSentryEnabled()) {
    return;
  }
  void import('@sentry/nextjs')
    .then((Sentry) => {
      Sentry.captureException(error, { tags: { domain: 'checkout', bookingId } });
    })
    .catch(() => {
      // Si ni siquiera se puede cargar Sentry, el console.error de
      // arriba es lo único que queda. No escalamos: el flujo del
      // proveedor no debe romperse por la telemetría.
    });
}
