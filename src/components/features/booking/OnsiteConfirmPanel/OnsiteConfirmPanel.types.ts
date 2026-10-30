import type { AppLocale } from '@/i18n/routing';

import type { OnsiteBookingState } from '../BookingFlow/BookingFlow.onsite';
import type { DisplayedBookingPrice } from '../DiscountedPrice';

/**
 * Tipos del panel de confirmación de una reserva con pago en el local.
 */

/** Qué salida ofrece el panel tras un fallo. */
export type OnsiteErrorAction = 'signIn' | 'chooseSlot' | 'payOnline' | 'myBookings' | 'retry';

export interface OnsiteConfirmPanelProps {
  /** Importe previsto: el definitivo lo congela el servidor al reservar. */
  price: DisplayedBookingPrice;
  slotStartIso: string;
  locale: AppLocale;
  state: OnsiteBookingState;
  /** Ruta del flujo (sin locale) a la que volver tras iniciar sesión. */
  redirectUrl: string;
  onConfirm: () => void;
  onChooseAnotherSlot: () => void;
  /** El local ya no vale para este hueco: volver al resumen con online. */
  onPayOnline: () => void;
}
