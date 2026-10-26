import 'server-only';

import { getPendingHoldCutoff } from '@/lib/services/booking';

import { cancelBookingPaymentIntent } from './checkout.payment-intent';
import { checkoutRepository, type CheckoutBookingRow } from './checkout.repository';
import type { ExpirePendingSummary } from './checkout.types';

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
 */

/**
 * Tope de reservas por ejecución. En Vercel Hobby el cron corre una vez
 * al día; 200 llamadas secuenciales a Stripe caben con holgura en la
 * duración máxima de la función, y lo que sobre se barre al día siguiente
 * (no bloquea franjas entretanto).
 */
const EXPIRY_BATCH_LIMIT = 200;

type ExpiryOutcome = 'expired' | 'skipped' | 'failed';

/**
 * Caduca las reservas `pending` creadas hace más de `PENDING_HOLD_MINUTES`.
 *
 * Idempotente y tolerante a fallos parciales: cada reserva se procesa por
 * separado, un error en una no aborta el resto, y repetir la ejecución
 * solo vuelve a intentar las que quedaron en `pending`.
 *
 * @param options.now — instante de referencia; inyectable para tests.
 * @returns recuento de lo escaneado, caducado, omitido y fallido.
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
    skipped: 0,
    failed: 0,
  };

  // Secuencial a propósito: el volumen es pequeño y así no disparamos
  // ráfagas contra el rate limit de Stripe ni contra el pooler de BD.
  for (const booking of candidates) {
    const outcome = await expireOne(booking, now);
    summary[outcome] += 1;
  }

  return summary;
}

/**
 * Caduca una reserva: primero Stripe, luego BD.
 *
 * El orden importa. Si cancelásemos en BD y Stripe dijese después que
 * el intent ya estaba cobrado, tendríamos una reserva muerta con dinero
 * dentro. Cancelando antes el intent, el "no cancelable" de Stripe nos
 * avisa a tiempo de dejar la reserva en paz para el webhook.
 */
async function expireOne(booking: CheckoutBookingRow, now: Date): Promise<ExpiryOutcome> {
  try {
    if (booking.stripePaymentIntentId) {
      // Clave propia por reserva: si un día BD falló tras cancelar en
      // Stripe, el reintento del día siguiente recibe el mismo resultado.
      const outcome = await cancelBookingPaymentIntent(
        booking.stripePaymentIntentId,
        `booking_expire_${booking.id}`,
      );
      // Cobrado o procesando: la reserva queda para el webhook.
      if (outcome !== 'canceled') return 'skipped';
    }
    // Condicional: si el webhook la confirmó en paralelo, no la pisamos.
    const applied = await checkoutRepository.cancelIfPending(booking.id, now);
    return applied ? 'expired' : 'skipped';
  } catch (err) {
    console.error('[checkout/expiry] failed to expire booking:', booking.id, err);
    return 'failed';
  }
}
