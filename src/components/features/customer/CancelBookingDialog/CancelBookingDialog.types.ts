/**
 * Tipos del diálogo con el que el cliente cancela una reserva.
 *
 * Los códigos se importan como tipo desde la server action: TypeScript
 * los borra al compilar y no arrastran nada de servidor al bundle.
 */
import type { CancelMyBookingErrorCode } from '@/app/[locale]/mis-reservas/cancel-actions';

export type { CancelMyBookingErrorCode };

export interface CancelBookingDialogProps {
  bookingId: string;
  /** Nombre del servicio ya resuelto al locale activo. */
  serviceName: string;
  providerName: string;
  /** Inicio en ISO-8601: alimenta la ventana de 2 h que vigila el cliente. */
  startAtIso: string;
  /** Fecha y hora ya formateadas para el texto del diálogo. */
  whenLabel: string;
  /** Importe de la reserva ya formateado (lo que se devuelve si hubo cobro). */
  amountLabel: string;
  /**
   * `true` si pagó online y se le devuelve el importe íntegro; `false`
   * si no hubo cobro (una `pending` o el futuro pago en el local).
   */
  refundable: boolean;
  /**
   * Vigilar la ventana de 2 h en el navegador. `false` en una `pending`
   * sin cobro, que se puede cancelar hasta el inicio.
   */
  enforceWindow: boolean;
}
