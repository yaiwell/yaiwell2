import 'server-only';

import { deliverEmail } from './notifications.delivery';
import { buildNoShowEmail, buildNoShowUndoneEmail } from './notifications.no-show-templates';
import { withBooking } from './notifications.service';
import type { NoShowNotice } from './notifications.types';

/**
 * El negocio ha marcado que el cliente no se presentó: aviso al cliente
 * (sin devolución si pagó online; sanción y, si salta, bloqueo si iba a
 * pagar en el local). **Nunca lanza.**
 *
 * Clave `no-show/<bookingId>-<noShowAt>`: un doble clic o un reintento no
 * duplican el correo, pero si el negocio lo deshace y lo vuelve a marcar
 * (otro `noShowAt`) el cliente sí recibe el aviso nuevo. Si el negocio lo
 * deshace antes de que salga, la reserva ya no está `no_show` y se descarta.
 *
 * @param bookingId — reserva recién marcada.
 * @param notice — lo que devolvió `markBookingNoShow`.
 */
export async function notifyBookingNoShow(bookingId: string, notice: NoShowNotice): Promise<void> {
  await withBooking('no-show', bookingId, ['no_show'], (ctx) =>
    deliverEmail(
      'no-show',
      `${bookingId}-${ctx.noShowAt?.getTime() ?? 'unknown'}`,
      ctx.client,
      buildNoShowEmail(ctx, notice),
    ),
  );
}

/**
 * El negocio ha deshecho el «no presentado»: aviso al cliente de que la
 * marca (y la sanción, si la había) queda retirada. Se manda siempre al
 * deshacer: el aviso de no presentado sale en segundos, así que lo normal
 * es que el cliente ya lo tenga. **Nunca lanza.**
 *
 * @param bookingId — reserva cuyo «no presentado» se ha deshecho.
 * @param sanctionRevoked — se retiró una sanción (reserva en el local).
 * @param undoneAt — instante del deshacer; la clave va por él para que
 *   cada deshacer tenga su aviso.
 */
export async function notifyNoShowUndone(
  bookingId: string,
  sanctionRevoked: boolean,
  undoneAt: Date,
): Promise<void> {
  await withBooking('no-show-undone', bookingId, ['confirmed', 'completed'], (ctx) =>
    deliverEmail(
      'no-show-undone',
      `${bookingId}-${undoneAt.getTime()}`,
      ctx.client,
      buildNoShowUndoneEmail(ctx, sanctionRevoked),
    ),
  );
}
