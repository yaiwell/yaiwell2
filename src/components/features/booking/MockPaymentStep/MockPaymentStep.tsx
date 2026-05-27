'use client';

import { useTranslations } from 'next-intl';

import { formatPriceCents } from '../BookingSummary/BookingSummary.logic';

import { useMockPayment } from './MockPaymentStep.logic';
import { mockPaymentStepStyles as s } from './MockPaymentStep.styles';
import type { MockPaymentStepProps } from './MockPaymentStep.types';

/**
 * Paso de pago simulado del flujo de reserva.
 *
 * No integra Stripe ni ningún proveedor de pago real. Muestra una
 * tarjeta visual genérica, el importe a pagar y un único botón "Pagar"
 * que espera 800ms antes de avanzar a la pantalla de confirmación.
 *
 * Es Client Component por el flag `isProcessing` y por el botón con
 * handler `onClick`.
 */
export function MockPaymentStep({ amountCents, locale, onComplete }: MockPaymentStepProps) {
  const t = useTranslations('booking.payment');
  const { isProcessing, pay } = useMockPayment(onComplete);

  return (
    <div className={s.root} data-component="booking-mock-payment">
      <div className={s.fakeCard} aria-hidden>
        <span className={s.fakeCardLabel}>{t('cardLabel')}</span>
        <span className={s.fakeCardNumber}>{'•••• •••• •••• 4242'}</span>
        <div className={s.fakeCardRow}>
          <span className={s.fakeCardSmall}>BEAULY DEMO</span>
          <span className={s.fakeCardSmall}>12/30</span>
        </div>
      </div>

      <div className={s.amountRow}>
        <span className={s.amountLabel}>{t('totalLabel')}</span>
        <span className={s.amountValue}>{formatPriceCents(amountCents, locale)}</span>
      </div>

      <button
        type="button"
        className={s.payButton}
        onClick={pay}
        disabled={isProcessing}
        aria-busy={isProcessing}
        data-component="booking-mock-payment-pay"
      >
        {isProcessing && <span className={s.payButtonSpinner} aria-hidden />}
        {isProcessing ? t('processing') : t('payCta')}
      </button>

      <p className={s.mockNote}>{t('mockNote')}</p>
    </div>
  );
}
