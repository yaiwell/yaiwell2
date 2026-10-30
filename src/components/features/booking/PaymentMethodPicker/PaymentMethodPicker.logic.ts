// Import directo al archivo client-safe, nunca al barrel de availability.
import { BUSINESS_TIMEZONE } from '@/lib/services/availability/availability.client';
import type { AppLocale } from '@/i18n/routing';
import { toIntlLocale } from '@/lib/i18n';
import { formatShortDayMonth } from '@/lib/utils/short-date';

import type { PaymentOptionsState } from '../BookingFlow/BookingFlow.paymentOptions';

import type { PaymentMethodPickerView } from './PaymentMethodPicker.types';

/**
 * Decide qué enseña el selector (§4.bis, pago en el local):
 *  - el negocio no lo ofrece, aún no sabemos o falló la consulta → nada
 *    (online es el único método y no hace falta preguntarlo);
 *  - última hora, cliente bloqueado o con el tope de reservas en el local
 *    → la opción, desactivada y con motivo;
 *  - disponible → las dos opciones.
 *
 * @param state — consulta de métodos de pago del hueco.
 */
export function resolvePickerView(state: PaymentOptionsState): PaymentMethodPickerView {
  if (state.status !== 'ready' || state.options.onsite === 'not_offered') {
    return { visible: false };
  }
  const { onsite, restrictedUntilIso } = state.options;
  return {
    visible: true,
    onsiteDisabledReason: onsite === 'available' ? null : onsite,
    restrictedUntilIso: onsite === 'client_restricted' ? restrictedUntilIso : null,
  };
}

/**
 * Fecha corta `dd/mm` del fin de un bloqueo, en hora del negocio. El
 * bloqueo vence a esa hora exacta: basta con el día para el cliente.
 *
 * @param iso — instante ISO-8601.
 * @param locale — idioma de la interfaz.
 */
export function formatRestrictionDate(iso: string, locale: AppLocale): string {
  return formatShortDayMonth(new Date(iso), toIntlLocale(locale), BUSINESS_TIMEZONE);
}
