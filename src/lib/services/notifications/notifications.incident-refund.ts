import 'server-only';

import { buildBookingCancelledEmail } from './notifications.booking-templates';
import { deliverEmail } from './notifications.delivery';
import {
  buildPastIncidentRefundEmail,
  buildProviderIncidentRefundEmail,
} from './notifications.incident-refund-templates';
import { withBooking } from './notifications.service';
import type { CancellationRefundState, IncidentSlotNotice } from './notifications.types';

/** Qué contar en los avisos de un reembolso por incidencia. */
export interface IncidentRefundNotice {
  refund: CancellationRefundState;
  previousStatus: 'confirmed' | 'completed';
  slot: IncidentSlotNotice;
}

/**
 * Soporte ha reembolsado una reserva por una incidencia del centro: aviso al
 * cliente con el estado de su dinero y al centro, cuyo saldo baja. **Nunca
 * lanza.**
 *
 * Si la cita estaba por venir, el cliente recibe el mismo correo que si
 * cancelara el centro («no puede atenderte»), con su misma clave. Si ya había
 * finalizado o empezado, uno propio. Las claves van por reserva y por estado
 * del dinero: reanudar un reembolso a medias no repite el mismo correo mientras
 * Resend recuerde la clave, pero sí cuenta que el «en trámite» ya se resolvió.
 *
 * @param bookingId — reserva cancelada por soporte.
 * @param notice — dinero, estado anterior y franja.
 * @param now — instante de referencia; inyectable en tests.
 */
export async function notifyCentreIncidentRefund(
  bookingId: string,
  notice: IncidentRefundNotice,
  now: Date = new Date(),
): Promise<void> {
  const { refund, previousStatus, slot } = notice;
  // Reanudar tras un «en trámite» manda otro texto: con la misma clave, Resend
  // lo rechazaría (clave repetida con otro contenido) y nadie sabría que salió.
  const kind = (base: string) => (refund === 'refund_pending' ? `${base}-pending` : base);
  await withBooking('incident-refund', bookingId, ['cancelled', 'refunded'], (ctx) => {
    const past = previousStatus === 'completed' || ctx.startAt.getTime() <= now.getTime();
    return Promise.all([
      past
        ? deliverEmail(
            kind('incident-refund-client'),
            bookingId,
            ctx.client,
            buildPastIncidentRefundEmail(ctx, refund),
          )
        : deliverEmail(
            kind('booking-cancelled'),
            bookingId,
            ctx.client,
            buildBookingCancelledEmail(ctx, refund),
          ),
      deliverEmail(
        kind('incident-refund-provider'),
        bookingId,
        ctx.owner,
        buildProviderIncidentRefundEmail(ctx, refund, slot),
      ),
    ]);
  });
}
