'use client';

import { Elements } from '@stripe/react-stripe-js';
import { useTranslations } from 'next-intl';
import { useMemo } from 'react';

import { useTheme } from '@/components/shared/ThemeToggle';

import { buildAppearance, getStripePromise, toStripeLocale } from './StripePaymentStep.logic';
import { stripePaymentStepStyles as s } from './StripePaymentStep.styles';
import { StripePaymentForm } from './StripePaymentForm';
import type { StripePaymentStepProps } from './StripePaymentStep.types';

/**
 * Paso de pago real del flujo de reserva.
 *
 * Monta el proveedor `<Elements>` con el `clientSecret` del PaymentIntent
 * y delega el formulario en `StripePaymentForm`. Sustituye al antiguo
 * paso mock: aquí se cobra de verdad contra la cuenta conectada del
 * centro, con la comisión de la plataforma retenida por Stripe.
 *
 * Si falta `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` no renderizamos Elements
 * — mostramos un aviso legible en vez de romper el árbol de React.
 */
export function StripePaymentStep({
  clientSecret,
  amountCents,
  locale,
  returnUrl,
  onSucceeded,
}: StripePaymentStepProps) {
  const t = useTranslations('booking.payment');
  const { resolved } = useTheme();

  const stripePromise = useMemo(() => getStripePromise(), []);

  // La apariencia se recalcula al cambiar el tema para que el iframe de
  // Stripe no se quede en claro dentro de una página en oscuro.
  const options = useMemo(
    () => ({
      clientSecret,
      appearance: buildAppearance(resolved),
      locale: toStripeLocale(locale),
    }),
    [clientSecret, resolved, locale],
  );

  if (!stripePromise) {
    return (
      <div className={s.statusBox} role="alert" data-component="booking-stripe-unavailable">
        <p className={s.statusTitle}>{t('unavailableTitle')}</p>
        <p className={s.statusText}>{t('unavailableBody')}</p>
      </div>
    );
  }

  return (
    <Elements stripe={stripePromise} options={options}>
      <StripePaymentForm
        amountCents={amountCents}
        locale={locale}
        returnUrl={returnUrl}
        onSucceeded={onSucceeded}
      />
    </Elements>
  );
}
