'use client';

import { useTranslations } from 'next-intl';

// `redirect-url` va por import directo, no por el barrel `@/lib/validation`
// (arrastra Prisma).
import { Link } from '@/i18n/navigation';
import type { AppLocale } from '@/i18n/routing';
import { MAX_ACTIVE_ONSITE_BOOKINGS } from '@/lib/utils/booking-payment-mode';
import { withRedirectUrl } from '@/lib/validation/redirect-url';

import type { OnsiteBookingFailure } from '../BookingFlow/BookingFlow.onsite';
import { formatRestrictionDate } from '../PaymentMethodPicker/PaymentMethodPicker.logic';
import { stripePaymentStepStyles as s } from '../StripePaymentStep/StripePaymentStep.styles';

import { resolveOnsiteErrorAction } from './OnsiteConfirmPanel.logic';

interface OnsiteConfirmErrorProps {
  error: OnsiteBookingFailure;
  locale: AppLocale;
  redirectUrl: string;
  onRetry: () => void;
  onChooseAnotherSlot: () => void;
  onPayOnline: () => void;
}

/**
 * Fallo al reservar en el local, con la salida que tiene sentido para
 * cada caso (ver `resolveOnsiteErrorAction`). Mismo aspecto que los
 * errores del checkout online.
 */
export function OnsiteConfirmError({
  error,
  locale,
  redirectUrl,
  onRetry,
  onChooseAnotherSlot,
  onPayOnline,
}: OnsiteConfirmErrorProps) {
  const t = useTranslations('booking.onsite.errors');
  const tCheckout = useTranslations('booking.checkout');
  const action = resolveOnsiteErrorAction(error);
  const message = resolveMessage(t, error, locale);

  return (
    <div className={s.statusBox} role="alert" data-component="booking-onsite-error">
      <p className={s.statusTitle}>{t('title')}</p>
      <p className={s.statusText}>{message}</p>
      {action === 'signIn' && (
        <>
          <p className={s.statusText}>{tCheckout('draftKeptHint')}</p>
          <Link href={withRedirectUrl('/registro', redirectUrl)} className={s.retryButton}>
            {tCheckout('signUp')}
          </Link>
          <Link href={withRedirectUrl('/entrar', redirectUrl)} className={s.retryButton}>
            {tCheckout('signIn')}
          </Link>
        </>
      )}
      {action === 'chooseSlot' && (
        <button type="button" onClick={onChooseAnotherSlot} className={s.retryButton}>
          {tCheckout('chooseAnotherSlot')}
        </button>
      )}
      {action === 'payOnline' && (
        <button
          type="button"
          onClick={onPayOnline}
          className={s.retryButton}
          data-component="booking-onsite-pay-online"
        >
          {t('payOnline')}
        </button>
      )}
      {action === 'myBookings' && (
        <Link href="/mis-reservas" className={s.retryButton}>
          {t('viewMyBookings')}
        </Link>
      )}
      {action === 'retry' && (
        <button type="button" onClick={onRetry} className={s.retryButton}>
          {tCheckout('retry')}
        </button>
      )}
    </div>
  );
}

/**
 * Copy del fallo. `switch` con claves literales para que next-intl las
 * valide en compilación (mismo criterio que `BookingCheckoutPanel`).
 */
function resolveMessage(
  t: ReturnType<typeof useTranslations<'booking.onsite.errors'>>,
  error: OnsiteBookingFailure,
  locale: AppLocale,
): string {
  switch (error.code) {
    case 'UNAUTHENTICATED':
      return t('unauthenticated');
    case 'SLOT_UNAVAILABLE':
      return t('slotUnavailable');
    case 'SLOT_TOO_SOON':
      return t('slotTooSoon');
    case 'SERVICE_UNAVAILABLE':
      return t('serviceUnavailable');
    case 'PENDING_ALREADY_PAID':
      return t('pendingAlreadyPaid');
    case 'ONSITE_NOT_ALLOWED':
      if (error.reason === 'last_minute') return t('lastMinute');
      if (error.reason === 'limit_reached') {
        return t('limitReached', { max: MAX_ACTIVE_ONSITE_BOOKINGS });
      }
      if (error.reason === 'client_restricted') {
        return error.restrictedUntilIso
          ? t('restrictedUntil', { date: formatRestrictionDate(error.restrictedUntilIso, locale) })
          : t('restricted');
      }
      return t('notOffered');
    case 'VALIDATION':
    case 'INTERNAL':
      return t('generic');
  }
}
