import 'server-only';

import { cancelBookingByProvider } from '@/lib/services/booking';

import { settleCancelledBookingPayment } from './checkout.cancellation-payment';
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

export type { ProviderCancellationResult } from './checkout.types';

/**
 * Cancela una reserva desde el panel del proveedor y devuelve el
 * importe íntegro al cliente.
 *
 * El dinero lo resuelve `settleCancelledBookingPayment`, el mismo camino
 * que la cancelación del cliente.
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

  // `previousStatus` sale de la misma lectura con la que el dominio
  // booking validó la cancelación: sin snapshot aparte, una ventana de
  // carrera menos con el webhook.
  const cancelled = await cancelBookingByProvider({ bookingId }, providerUserId);
  return settleCancelledBookingPayment(cancelled, 'provider');
}
