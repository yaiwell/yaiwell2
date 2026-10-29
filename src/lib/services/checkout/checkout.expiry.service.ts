import 'server-only';

import { getPendingHoldCutoff } from '@/lib/services/booking';

import { tryExpirePendingBooking } from './checkout.expire-one';
import {
  reportStuckPendingBooking,
  settleLostWebhookPayment,
} from './checkout.lost-webhook.service';
import { checkoutRepository, type CheckoutBookingRow } from './checkout.repository';
import type { BookingTransitionResult, ExpirePendingSummary } from './checkout.types';

/**
 * Barrido de reservas `pending` abandonadas.
 *
 * Desde que vence `PENDING_HOLD_MINUTES` una `pending` ya no bloquea la
 * franja (las consultas de disponibilidad la ignoran), así que este cron
 * no es lo que libera huecos: es **limpieza**. Deja la reserva en
 * `cancelled` para que paneles e informes no muestren pendientes eternas,
 * y cancela el PaymentIntent para que el cliente no pueda pagar una
 * reserva que ya no existe. Si aun así llega un pago (carrera con el
 * cron), el webhook lo devuelve en automático.
 *
 * Desde la auditoría N6 también es la red de los webhooks perdidos: una
 * `pending` cobrada en Stripe y sin `succeeded` procesado se asienta
 * aquí en vez de saltarse cada día para siempre.
 */

/**
 * Tope de reservas por ejecución. En Vercel Hobby el cron corre una vez
 * al día; 200 llamadas secuenciales a Stripe caben con holgura en la
 * duración máxima de la función, y lo que sobre se barre al día siguiente
 * (no bloquea franjas entretanto).
 */
const EXPIRY_BATCH_LIMIT = 200;

/** Desenlace de una reserva del barrido. */
type ExpiryOutcome =
  | { kind: 'expired' | 'skipped' | 'failed' }
  | { kind: 'settled'; result: BookingTransitionResult };

/**
 * Caduca las reservas `pending` creadas hace más de `PENDING_HOLD_MINUTES`.
 *
 * Idempotente y tolerante a fallos parciales: cada reserva se procesa por
 * separado, un error en una no aborta el resto, y repetir la ejecución
 * solo vuelve a intentar las que quedaron en `pending`.
 *
 * Las que Stripe da por cobradas y siguen en `pending` tienen el webhook
 * perdido: se asientan con la lógica del webhook (ver
 * `checkout.lost-webhook.service`) y salen en `settlements` para que el
 * route avise al cliente igual que lo habría hecho el webhook.
 *
 * @param options.now — instante de referencia; inyectable para tests.
 * @returns recuento de lo escaneado, caducado, asentado, omitido y fallido.
 */
export async function expireAbandonedPendingBookings(
  options: { now?: Date } = {},
): Promise<ExpirePendingSummary> {
  const now = options.now ?? new Date();
  const candidates = await checkoutRepository.findExpiredPending(
    getPendingHoldCutoff(now),
    EXPIRY_BATCH_LIMIT,
  );

  const summary: ExpirePendingSummary = {
    scanned: candidates.length,
    expired: 0,
    settled: 0,
    skipped: 0,
    failed: 0,
    settlements: [],
  };

  // Secuencial a propósito: el volumen es pequeño y así no disparamos
  // ráfagas contra el rate limit de Stripe ni contra el pooler de BD.
  for (const booking of candidates) {
    const outcome = await expireOne(booking, now);
    summary[outcome.kind] += 1;
    if (outcome.kind === 'settled') summary.settlements.push(outcome.result);
  }

  return summary;
}

/**
 * Caduca una reserva o, si Stripe ya la cobró, intenta asentar el pago.
 *
 * `processing` se deja estar: algunos métodos (adeudos SEPA) tardan días
 * en resolverse y su webhook llegará. Solo se avisa a Sentry, como
 * `warning`, si la reserva lleva más de un día así.
 */
async function expireOne(booking: CheckoutBookingRow, now: Date): Promise<ExpiryOutcome> {
  try {
    const attempt = await tryExpirePendingBooking(booking, now);
    switch (attempt) {
      case 'expired':
        return { kind: 'expired' };
      case 'not_pending':
      // Sin cobro y sin poder cancelar hoy (clave con un "no cancelable"
      // cacheado): mañana la clave habrá caducado. Nada que avisar.
      case 'still_open':
        return { kind: 'skipped' };
      case 'processing':
        reportStuckPendingBooking(booking, now, 'PaymentIntent still processing', 'warning');
        return { kind: 'skipped' };
      case 'already_paid': {
        const result = await settleLostWebhookPayment(booking, now);
        return result ? { kind: 'settled', result } : { kind: 'skipped' };
      }
    }
  } catch (err) {
    console.error('[checkout/expiry] failed to expire booking:', booking.id, err);
    reportStuckPendingBooking(booking, now, 'expiry sweep failed');
    return { kind: 'failed' };
  }
}
