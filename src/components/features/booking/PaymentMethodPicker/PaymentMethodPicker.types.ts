import type { AppLocale } from '@/i18n/routing';

import type { PaymentOptionsState } from '../BookingFlow/BookingFlow.paymentOptions';
import type { BookingPaymentMethod } from '../BookingFlow/BookingFlow.types';

/**
 * Tipos del selector de método de pago del paso de resumen.
 */

/** Por qué el pago en el local se enseña desactivado. */
export type OnsiteDisabledReason = 'last_minute' | 'client_restricted' | 'limit_reached';

/** Lo que el selector pinta, ya decidido a partir de la consulta. */
export type PaymentMethodPickerView =
  | { visible: false }
  | {
      visible: true;
      /** `null` si se puede elegir pagar en el local. */
      onsiteDisabledReason: OnsiteDisabledReason | null;
      /** Fin del bloqueo del cliente (ISO-8601), solo con `client_restricted`. */
      restrictedUntilIso: string | null;
    };

export interface PaymentMethodPickerProps {
  /** Métodos de pago disponibles para el hueco elegido. */
  options: PaymentOptionsState;
  /** Método marcado (el efectivo: online si el local no está disponible). */
  value: BookingPaymentMethod;
  onChange: (method: BookingPaymentMethod) => void;
  locale: AppLocale;
}
