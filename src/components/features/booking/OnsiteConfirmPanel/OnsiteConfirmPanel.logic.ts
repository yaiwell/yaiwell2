import type { OnsiteBookingFailure } from '../BookingFlow/BookingFlow.onsite';

import type { OnsiteErrorAction } from './OnsiteConfirmPanel.types';

/**
 * Salida útil tras un fallo al reservar en el local. Reintentar lo mismo
 * solo tiene sentido ante fallos pasajeros; el resto pide otra cosa:
 * entrar, otra hora, pagar online o revisar la reserva ya pagada.
 *
 * @param error — fallo devuelto por `createOnsiteBookingAction`.
 */
export function resolveOnsiteErrorAction(error: OnsiteBookingFailure): OnsiteErrorAction {
  switch (error.code) {
    case 'UNAUTHENTICATED':
      return 'signIn';
    case 'SLOT_UNAVAILABLE':
    case 'SLOT_TOO_SOON':
    case 'SERVICE_UNAVAILABLE':
      return 'chooseSlot';
    case 'ONSITE_NOT_ALLOWED':
      return 'payOnline';
    case 'PENDING_ALREADY_PAID':
      return 'myBookings';
    case 'VALIDATION':
    case 'INTERNAL':
      return 'retry';
  }
}
