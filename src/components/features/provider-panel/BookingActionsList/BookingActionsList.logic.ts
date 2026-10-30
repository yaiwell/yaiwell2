import { canCancelBooking } from '@/lib/utils/booking-cancellation';
import { canCompleteBooking, canMarkNoShow, canUndoNoShow } from '@/lib/utils/booking-no-show';

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
   * Solo `confirmed` y ya empezada puede marcarse como finalizada: saltar
   * desde `pending` sería dar por atendido algo sin pagar, y antes del
   * inicio no se ha prestado nada (el service lo rechaza igualmente,
   * aquí evitamos ofrecerlo). En preview, sin instante, basta el estado.
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
  /**
   * Reserva cancelada (por el centro o por el cliente) cuya hora aún se
   * puede liberar con descuento: lo decide el servidor en `releasable`.
   * Sin `startAtIso` (preview) no hay hora que liberar.
   */
  releasable: boolean;
  /**
   * «No se presentó»: `confirmed` y entre el inicio y 72 h después
   * (§4.bis). Mismas reglas que `markBookingNoShow`.
   */
  canMarkNoShow: boolean;
  /** «Deshacer» un no presentado: dentro de las 24 h desde que se marcó. */
  canUndoNoShow: boolean;
  /** La reserva se paga en el local (etiqueta y textos de los diálogos). */
  isOnsite: boolean;
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

    // Sin instante real (modo preview) no se ofrecen las acciones de
    // no presentado: dependen de la hora de la cita.
    const startAt = booking.startAtIso ? new Date(booking.startAtIso) : null;
    const noShowAt = booking.noShowAtIso ? new Date(booking.noShowAtIso) : null;

    return {
      booking,
      canComplete: startAt
        ? canCompleteBooking({ status: booking.status, startAt }, now)
        : booking.status === 'confirmed',
      showCancel,
      cancellable,
      releasable: booking.releasable === true && booking.startAtIso !== null,
      canMarkNoShow: startAt !== null && canMarkNoShow({ status: booking.status, startAt }, now),
      canUndoNoShow: canUndoNoShow({ status: booking.status, noShowAt }, now),
      isOnsite: booking.paymentMode === 'onsite',
    };
  });
}
