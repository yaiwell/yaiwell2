import 'server-only';

import {
  buildClientCancellationEmail,
  buildProviderClientCancelledEmail,
} from './notifications.client-cancellation-templates';
import { deliverEmail } from './notifications.delivery';
import { withBooking } from './notifications.service';
import type { CancellationRefundState } from './notifications.types';

/**
 * El cliente ha cancelado su reserva desde `/mis-reservas`: confirmación
 * al cliente (con el estado de su dinero) y aviso al centro de que la
 * franja vuelve a estar libre. **Nunca lanza.**
 *
 * Las claves de idempotencia van por reserva: una reserva solo se
 * cancela una vez, y un doble clic que llegue a disparar dos avisos no
 * manda dos correos.
 *
 * Al centro se le ofrece liberar la hora con descuento, salvo que la
 * reserva viniera de una oferta que sigue activa (`offerReopened`).
 *
 * @param bookingId — reserva recién cancelada por su cliente.
 * @param refund — qué contar al cliente sobre su dinero.
 * @param offerReopened — la hora vuelve a anunciarse con su oferta.
 */
export async function notifyBookingCancelledByClient(
  bookingId: string,
  refund: CancellationRefundState,
  offerReopened = false,
): Promise<void> {
  await withBooking('client-cancellation', bookingId, ['cancelled', 'refunded'], (ctx) =>
    Promise.all([
      deliverEmail(
        'client-cancellation-client',
        bookingId,
        ctx.client,
        buildClientCancellationEmail(ctx, refund),
      ),
      deliverEmail(
        'client-cancellation-provider',
        bookingId,
        ctx.owner,
        buildProviderClientCancelledEmail(ctx, offerReopened),
      ),
    ]),
  );
}
