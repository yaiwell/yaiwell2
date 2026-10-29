import 'server-only';

import { cancelBookingByClient } from '@/lib/services/booking';

import { settleCancelledBookingPayment } from './checkout.cancellation-payment';
import type { BookingCancellationResult } from './checkout.types';
import { cancelBookingWithRefundSchema } from './checkout.validation';

/**
 * Cancela una reserva a petición de su cliente y le devuelve el importe
 * íntegro si pagó online (§4.bis de CLAUDE.md, decidido 2026-10-29).
 *
 * «Íntegro» incluye la comisión de Yaiwell (`refund_application_fee`),
 * decidido por el dev el 2026-10-29: si la cancelación es a tiempo, el
 * cliente recupera exactamente lo que pagó. La tarifa de Stripe del
 * cobro original la asume la plataforma.
 *
 * Mismo orden y misma maquinaria que la cancelación del proveedor
 * (`cancelBookingByProviderWithRefund`): primero las reglas y la BD
 * (irreversible: libera el hueco), después Stripe (reintentable, con
 * clave de idempotencia). Un fallo de Stripe no deshace la cancelación:
 * la reserva entra en la cola de reembolsos de /admin.
 *
 * Las reglas (propiedad, estado, última hora, ventana de 2 h) las aplica
 * `cancelBookingByClient`; sus errores se propagan tal cual y ocurren
 * **antes** de tocar dinero.
 *
 * @param input — payload crudo con el `bookingId` (validado con Zod).
 * @param clientUserId — `User.id` interno del cliente autenticado.
 * @returns el desenlace de la cancelación y del reembolso.
 * @throws BookingNotFoundError — la reserva no existe.
 * @throws UnauthorizedCancellationError — la reserva es de otro cliente.
 * @throws BookingNotCancellableError — su estado no admite cancelación.
 * @throws LastMinuteBookingNotCancellableError — es de última hora.
 * @throws BookingTooLateToCancelError — faltan menos de 2 h.
 */
export async function cancelBookingByClientWithRefund(
  input: unknown,
  clientUserId: string,
): Promise<BookingCancellationResult> {
  const { bookingId } = cancelBookingWithRefundSchema.parse(input);
  const cancelled = await cancelBookingByClient({ bookingId }, clientUserId);
  const result = await settleCancelledBookingPayment(cancelled, 'client');
  // La oferta de origen no se retiró: la hora vuelve a anunciarse con
  // su descuento (ver `commitCancellation`).
  return { ...result, offerReopened: Boolean(cancelled.slotOfferId) };
}
