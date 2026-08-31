'use client';

import { PaymentElement } from '@stripe/react-stripe-js';
import { ShieldCheck } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { formatPriceCents } from '../BookingSummary/BookingSummary.logic';

import { useStripePaymentForm } from './StripePaymentStep.logic';
import { stripePaymentStepStyles as s } from './StripePaymentStep.styles';
import type { StripePaymentFormProps } from './StripePaymentStep.types';

/**
 * Formulario de pago propiamente dicho.
 *
 * Vive dentro de `<Elements>` porque los hooks `useStripe`/`useElements`
 * dependen de ese contexto. Sólo compone JSX: el submit y los estados
 * los aporta `useStripePaymentForm`.
 */
export function StripePaymentForm({
  amountCents,
  locale,
  returnUrl,
  onSucceeded,
}: StripePaymentFormProps) {
  const t = useTranslations('booking.payment');
  const { isReady, isProcessing, hasError, errorMessage, submit } = useStripePaymentForm({
    returnUrl,
    onSucceeded,
  });

  return (
    <form className={s.root} onSubmit={submit} data-component="booking-stripe-payment">
      <div className={s.amountRow}>
        <span className={s.amountLabel}>{t('totalLabel')}</span>
        <span className={s.amountValue}>{formatPriceCents(amountCents, locale)}</span>
      </div>

      <div className={s.elementWrapper}>
        <PaymentElement options={{ layout: 'tabs' }} />
      </div>

      {hasError && (
        <p className={s.errorBox} role="alert" data-component="booking-stripe-payment-error">
          {errorMessage ?? t('genericError')}
        </p>
      )}

      <button
        type="submit"
        className={s.payButton}
        disabled={!isReady || isProcessing}
        aria-busy={isProcessing}
        data-component="booking-stripe-payment-submit"
      >
        {isProcessing && <span className={s.payButtonSpinner} aria-hidden />}
        {isProcessing
          ? t('processing')
          : t('payCta', { amount: formatPriceCents(amountCents, locale) })}
      </button>

      <p className={s.secureNote}>
        <ShieldCheck className={s.secureIcon} aria-hidden />
        {t('secureNote')}
      </p>
    </form>
  );
}
