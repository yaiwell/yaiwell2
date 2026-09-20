import { canCancelBooking } from '@/lib/utils/booking-cancellation';

import type { PanelBookingAction } from './BookingActionsList.types';

/**
 * Fila del listado con las decisiones de UI ya resueltas.
 *
 * Se calcula en el servidor (el componente es Server Component) para
 * que el primer HTML ya llegue con el estado correcto de los botones.
 */
export interface BookingActionRow {
  booking: PanelBookingAction;
  /**
   * Solo `confirmed` puede marcarse como finalizada: saltar desde
   * `pending` sería dar por atendido algo que todavía no se ha pagado
   * (el service lo rechaza igualmente, aquí evitamos ofrecerlo).
   */
  canComplete: boolean;
  /** Si procede mostrar el botón de cancelar (estados aún vivos). */
  showCancel: boolean;
  /**
   * Si la ventana de 2 h de §4.bis sigue abierta en este instante.
   * El cliente la revalida con el reloj real; la fuente de verdad
   * definitiva es el service, que la vuelve a comprobar.
   */
  cancellable: boolean;
}

/** Estados en los que una reserva todavía admite cancelación. */
const CANCELLABLE_STATUSES = new Set(['pending', 'confirmed']);

/**
 * Deriva, para cada reserva, qué acciones tienen sentido ofrecer.
 *
 * @param bookings — reservas de la semana (orden ya resuelto en el service).
 * @param now — momento de referencia para la ventana de 2 h.
 * @returns filas con los flags de UI resueltos.
 */
export function buildBookingActionRows(
  bookings: PanelBookingAction[],
  now: Date = new Date(),
): BookingActionRow[] {
  return bookings.map((booking) => {
    const showCancel = CANCELLABLE_STATUSES.has(booking.status);

    // Sin `startAtIso` (modo preview) no hay instante que evaluar:
    // damos la ventana por cerrada en lugar de inventarnos una fecha.
    const cancellable =
      showCancel && booking.startAtIso !== null
        ? canCancelBooking({ startAt: new Date(booking.startAtIso), status: booking.status }, now)
        : false;

    return {
      booking,
      canComplete: booking.status === 'confirmed',
      showCancel,
      cancellable,
    };
  });
}
