'use client';

import { useTranslations } from 'next-intl';

import { MAX_ACTIVE_ONSITE_BOOKINGS } from '@/lib/utils/booking-payment-mode';

import { formatRestrictionDate, resolvePickerView } from './PaymentMethodPicker.logic';
import { paymentMethodPickerStyles as s } from './PaymentMethodPicker.styles';
import type { PaymentMethodPickerProps } from './PaymentMethodPicker.types';

/**
 * Selector «¿Cómo quieres pagar?» del paso de resumen (§4.bis, pago en
 * el local). Va antes de crear nada: elegir aquí no reserva.
 *
 * Si el negocio no ofrece pagar en el local no se pinta (online es el
 * único método). Si no está disponible para este hueco o este cliente,
 * la opción aparece desactivada con el motivo: así nadie se pregunta
 * por qué no la ve en este centro cuando sí la vio otro día.
 *
 * Client Component: radios controlados por el orquestador.
 */
export function PaymentMethodPicker({
  options,
  value,
  onChange,
  locale,
}: PaymentMethodPickerProps) {
  const t = useTranslations('booking.paymentMethod');
  const view = resolvePickerView(options);
  if (!view.visible) return null;

  const onsiteDisabled = view.onsiteDisabledReason !== null;
  const onsiteHint = (() => {
    if (view.onsiteDisabledReason === 'last_minute') return t('onsite.lastMinute');
    if (view.onsiteDisabledReason === 'limit_reached') {
      return t('onsite.limitReached', { max: MAX_ACTIVE_ONSITE_BOOKINGS });
    }
    if (view.onsiteDisabledReason !== 'client_restricted') return t('onsite.hint');
    return view.restrictedUntilIso
      ? t('onsite.restrictedUntil', {
          date: formatRestrictionDate(view.restrictedUntilIso, locale),
        })
      : t('onsite.restricted');
  })();

  return (
    <fieldset className={s.root} data-component="booking-payment-method">
      <legend className={s.legend}>{t('legend')}</legend>
      <div className={s.options}>
        <label className={s.option} data-component="booking-payment-method-online">
          <input
            type="radio"
            name="booking-payment-method"
            value="online"
            className={s.radio}
            checked={value === 'online'}
            onChange={() => onChange('online')}
          />
          <span className={s.optionBody}>
            <span className={s.optionTitle}>{t('online.title')}</span>
            <span className={s.optionHint}>{t('online.hint')}</span>
          </span>
        </label>

        <label
          className={onsiteDisabled ? s.optionDisabled : s.option}
          data-component="booking-payment-method-onsite"
        >
          <input
            type="radio"
            name="booking-payment-method"
            value="onsite"
            className={s.radio}
            checked={value === 'onsite'}
            disabled={onsiteDisabled}
            aria-describedby="booking-payment-method-onsite-hint"
            onChange={() => onChange('onsite')}
          />
          <span className={s.optionBody}>
            <span className={s.optionTitle}>{t('onsite.title')}</span>
            <span
              className={s.optionHint}
              id="booking-payment-method-onsite-hint"
              data-component="booking-payment-method-onsite-hint"
            >
              {onsiteHint}
            </span>
          </span>
        </label>
      </div>
    </fieldset>
  );
}
