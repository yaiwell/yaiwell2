import { CheckCircle2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Link } from '@/i18n/navigation';
import { pickLocalized } from '@/lib/i18n/pickLocalized';

import {
  formatPriceCents,
  formatSlotDateLong,
  formatSlotTimeOnly,
} from '../BookingSummary/BookingSummary.logic';

import { bookingConfirmationStyles as s } from './BookingConfirmation.styles';
import type { BookingConfirmationProps } from './BookingConfirmation.types';

/**
 * Pantalla final del flujo de reserva.
 *
 * Server Component: solo recibe props y compone JSX (los textos vienen
 * de `next-intl`, que funciona en SSR). No necesita ningún hook ni
 * estado; el "estado" del pago se lo dicta `paymentPending`, que en
 * ambos caminos (3DS y sin 3DS) sale de BD y no del retorno de Stripe.
 */
export function BookingConfirmation({
  provider,
  service,
  locale,
  slotStartIso,
  slotEndIso,
  bookingId,
  providerSlugWithId,
  amountCents,
  paymentPending = false,
}: BookingConfirmationProps) {
  const t = useTranslations('booking.confirmation');

  // `en` y `de` son opcionales en `LocalizedText`: indexar a pelo dejaba
  // el nombre del servicio en blanco en esos dos idiomas.
  const serviceName = pickLocalized(service.name, locale);

  return (
    <div className={s.root} data-component="booking-confirmation">
      <span className={s.iconCircle} aria-hidden>
        <CheckCircle2 className={s.icon} aria-hidden />
      </span>

      <div className={s.titleBlock}>
        <h2 className={s.title}>{paymentPending ? t('pendingTitle') : t('title')}</h2>
        <p className={s.subtitle}>{paymentPending ? t('pendingSubtitle') : t('subtitle')}</p>
      </div>

      <dl className={s.detailsCard}>
        <div className={s.row}>
          <dt className={s.rowLabel}>{t('bookingIdLabel')}</dt>
          <dd className={s.rowValueMono}>{bookingId}</dd>
        </div>
        <div className={s.row}>
          <dt className={s.rowLabel}>{t('providerLabel')}</dt>
          <dd className={s.rowValue}>{provider.name}</dd>
        </div>
        <div className={s.row}>
          <dt className={s.rowLabel}>{t('serviceLabel')}</dt>
          <dd className={s.rowValue}>{serviceName}</dd>
        </div>
        <div className={s.row}>
          <dt className={s.rowLabel}>{t('whenLabel')}</dt>
          {/* `formatSlotDateLong` ya incluye la hora de inicio, así que
              la de fin cierra un rango: separador `→`, el mismo que usa
              el resumen. Con `·` parecía una lista de dos horas sueltas. */}
          <dd className={s.rowValue}>
            {formatSlotDateLong(slotStartIso, locale)}
            {' → '}
            {formatSlotTimeOnly(slotEndIso, locale)}
          </dd>
        </div>
        <div className={s.row}>
          <dt className={s.rowLabel}>{t('totalLabel')}</dt>
          <dd className={s.rowValue}>{formatPriceCents(amountCents, locale)}</dd>
        </div>
      </dl>

      <div className={s.actions}>
        <Link
          href={`/centro/${providerSlugWithId}`}
          className={s.secondaryAction}
          data-component="booking-confirmation-back-to-provider"
        >
          {t('backToProvider')}
        </Link>
        {/* El copy de "pago en curso" remite a «Mis reservas»: desde
            aquí se llega, que es donde el estado se relee en cada
            visita. Sustituye a "Seguir explorando", que mandaba al
            catálogo a alguien que acababa de pagar. */}
        <Link
          href="/mis-reservas"
          className={s.primaryAction}
          data-component="booking-confirmation-my-bookings"
        >
          {t('viewMyBookings')}
        </Link>
      </div>
    </div>
  );
}
