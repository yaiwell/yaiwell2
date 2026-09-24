'use client';

import { useTranslations } from 'next-intl';

import { Link } from '@/i18n/navigation';
import type { AppLocale } from '@/i18n/routing';
// Import directo al módulo, no al barrel `@/lib/validation`: ése
// reexporta `sign-up-params`, que arrastra el barrel de `plans` y con
// él Prisma. Desde un Client Component eso mete `pg` en el bundle y
// rompe el build.
import { withRedirectUrl } from '@/lib/validation/redirect-url';

import { StripePaymentStep } from '../StripePaymentStep';
import { stripePaymentStepStyles as s } from '../StripePaymentStep/StripePaymentStep.styles';

import type { CheckoutState } from './BookingFlow.types';

interface BookingCheckoutPanelProps {
  checkout: CheckoutState;
  locale: AppLocale;
  /** URL absoluta de retorno tras un 3DS. */
  returnUrl: string;
  /**
   * Ruta interna del flujo, sin prefijo de locale, a la que volver tras
   * autenticarse. Viaja como `redirect_url` a `/entrar` y `/registro`.
   */
  redirectUrl: string;
  onSucceeded: () => void;
  onRetry: () => void;
  /** Descarta el hueco actual y vuelve al calendario. */
  onChooseAnotherSlot: () => void;
}

/**
 * Panel del paso de pago: decide qué pintar según el estado del checkout.
 *
 * Va en su propio archivo para que `BookingFlow.tsx` siga leyéndose como
 * lo que es (composición de pasos) y no se llene de ramas de error.
 */
export function BookingCheckoutPanel({
  checkout,
  locale,
  returnUrl,
  redirectUrl,
  onSucceeded,
  onRetry,
  onChooseAnotherSlot,
}: BookingCheckoutPanelProps) {
  const t = useTranslations('booking.checkout');

  if (checkout.status === 'ready') {
    return (
      <StripePaymentStep
        clientSecret={checkout.clientSecret}
        amountCents={checkout.amountCents}
        locale={locale}
        returnUrl={returnUrl}
        onSucceeded={onSucceeded}
      />
    );
  }

  if (checkout.status === 'error') {
    return (
      <div className={s.statusBox} role="alert" data-component="booking-checkout-error">
        <p className={s.statusTitle}>{t('errorTitle')}</p>
        <p className={s.statusText}>{resolveErrorMessage(t, checkout.code)}</p>
        {checkout.code === 'UNAUTHENTICATED' ? (
          // El anónimo llega aquí con el hueco elegido y las notas
          // escritas. Los dos enlaces llevan `redirect_url` para
          // devolverlo a este mismo flujo, y el borrador sigue en
          // `sessionStorage`: al volver no tiene que rehacer nada.
          <>
            <p className={s.statusText} data-component="booking-checkout-draft-kept">
              {t('draftKeptHint')}
            </p>
            <Link
              href={withRedirectUrl('/registro', redirectUrl)}
              className={s.retryButton}
              data-component="booking-checkout-sign-up"
            >
              {t('signUp')}
            </Link>
            <Link
              href={withRedirectUrl('/entrar', redirectUrl)}
              className={s.retryButton}
              data-component="booking-checkout-sign-in"
            >
              {t('signIn')}
            </Link>
          </>
        ) : checkout.code === 'SLOT_UNAVAILABLE' ? (
          // Reintentar el mismo hueco fallaría siempre: otro cliente se
          // lo ha quedado. La única acción útil es elegir otro.
          <button
            type="button"
            onClick={onChooseAnotherSlot}
            className={s.retryButton}
            data-component="booking-checkout-choose-another-slot"
          >
            {t('chooseAnotherSlot')}
          </button>
        ) : (
          <button type="button" onClick={onRetry} className={s.retryButton}>
            {t('retry')}
          </button>
        )}
      </div>
    );
  }

  // `idle` y `creating` comparten pantalla: en ambos casos el usuario
  // está esperando a que se abra el checkout.
  return (
    <div className={s.statusBox} aria-busy data-component="booking-checkout-loading">
      <span className={s.statusSpinner} aria-hidden />
      <p className={s.statusTitle}>{t('loadingTitle')}</p>
      <p className={s.statusText}>{t('loadingBody')}</p>
    </div>
  );
}

/**
 * Traduce el código de error de la server action a copy localizado.
 *
 * Se escribe como `switch` con claves literales (y no como plantilla
 * `t(\`error.${code}\`)`) porque next-intl valida las claves en tiempo de
 * compilación contra `es.json`: una clave construida en runtime se
 * escaparía del typecheck y podría romper en producción.
 */
function resolveErrorMessage(
  t: ReturnType<typeof useTranslations<'booking.checkout'>>,
  code: Extract<CheckoutState, { status: 'error' }>['code'],
): string {
  switch (code) {
    case 'UNAUTHENTICATED':
      return t('errorUnauthenticated');
    case 'SERVICE_UNAVAILABLE':
      return t('errorServiceUnavailable');
    case 'SLOT_UNAVAILABLE':
      return t('errorSlotUnavailable');
    case 'PROVIDER_NOT_CHARGEABLE':
      return t('errorProviderNotChargeable');
    case 'PAYMENT_FAILED':
      return t('errorPaymentFailed');
    case 'VALIDATION':
    case 'INTERNAL':
      return t('errorGeneric');
  }
}
