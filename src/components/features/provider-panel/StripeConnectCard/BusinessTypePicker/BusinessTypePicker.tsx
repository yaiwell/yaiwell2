'use client';

import { useTranslations } from 'next-intl';
import { useId } from 'react';

import type { ConnectBusinessType } from '@/lib/services/payments';

import { businessTypePickerStyles as s } from './BusinessTypePicker.styles';
import type { BusinessTypePickerProps } from './BusinessTypePicker.types';

const OPTIONS: readonly ConnectBusinessType[] = ['individual', 'company'];

/**
 * Selector de forma jurídica antes del alta en Stripe.
 *
 * Radios nativos dentro de un `fieldset` con `legend`: el lector de
 * pantalla anuncia el grupo y las flechas cambian de opción sin JS
 * propio. Cada opción lleva una línea sobre qué datos pedirá Stripe.
 */
export function BusinessTypePicker({
  value,
  onChange,
  disabled,
  errorId,
}: BusinessTypePickerProps) {
  const t = useTranslations('providerPanel.payments.businessType');
  const name = useId();

  return (
    <fieldset className={s.fieldset} aria-describedby={errorId} disabled={disabled}>
      <legend className={s.legend}>{t('legend')}</legend>
      <div className={s.options}>
        {OPTIONS.map((option) => {
          const hintId = `${name}-${option}-hint`;
          return (
            <label key={option} className={s.option} data-component="business-type-option">
              <input
                type="radio"
                name={name}
                value={option}
                checked={value === option}
                onChange={() => onChange(option)}
                aria-describedby={hintId}
                className={s.radio}
              />
              <span className={s.text}>
                <span className={s.label}>{t(`${option}.label`)}</span>
                <span id={hintId} className={s.hint}>
                  {t(`${option}.hint`)}
                </span>
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
