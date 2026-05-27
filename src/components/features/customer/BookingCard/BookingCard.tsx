'use client';

import { CalendarClock, MapPin, Star, User } from 'lucide-react';
import { useFormatter, useLocale, useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/utils';
import { canCancelBooking } from '@/lib/utils/booking-cancellation';

import { useBookingCardCancel } from './BookingCard.logic';
import { bookingCardStyles as s } from './BookingCard.styles';
import type { BookingCardProps } from './BookingCard.types';

/**
 * Devuelve el modificador de estilo correspondiente al status de la
 * reserva. Centralizado aquí para no contaminar el JSX con ternarios.
 */
function statusClassName(status: BookingCardProps['booking']['status']): string {
  switch (status) {
    case 'pending':
      return s.statusPending;
    case 'confirmed':
      return s.statusConfirmed;
    case 'completed':
      return s.statusCompleted;
    case 'cancelled':
      return s.statusCancelled;
    case 'refunded':
      return s.statusRefunded;
  }
}

/**
 * Card de una reserva del cliente.
 *
 * Se renderiza en tres contextos (próximas, historial, valoraciones
 * pendientes) y cambia las acciones según la variante:
 *  - `upcoming`: botón "Cancelar" (bloqueado si <2h) + "Ver detalle".
 *  - `past`: solo botón "Ver detalle".
 *  - `pendingReview`: CTA primario "Valorar" + "Ver detalle".
 *
 * La política de 2h se evalúa con `canCancelBooking`, función pura que
 * comparte el resto del sistema.
 */
export function BookingCard({ booking, variant, now }: BookingCardProps) {
  const t = useTranslations('customerArea');
  const locale = useLocale();
  const format = useFormatter();
  const { state, requestCancel } = useBookingCardCancel();

  const cancellable = canCancelBooking(booking, now);
  const isCancelled = state === 'cancelled' || booking.status === 'cancelled';
  // El nombre del servicio viene del dominio (`LocalizedText`) y se
  // resuelve aquí según el locale activo para evitar lookups en JSX.
  const serviceName = booking.serviceName[locale as 'es' | 'ca'] ?? booking.serviceName.es;
  const priceFormatted = format.number(booking.priceCents / 100, {
    style: 'currency',
    currency: 'EUR',
  });

  return (
    <article
      className={s.root}
      data-component={`customer-booking-card-${booking.id}`}
      data-status={booking.status}
    >
      <div className={s.imageWrapper}>
        {/* Foto del proveedor (decorativa: el contexto lo da el texto). */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={booking.providerPhoto}
          alt=""
          aria-hidden="true"
          className={s.image}
          loading="lazy"
        />
      </div>

      <div className={s.body}>
        <div className={s.headerRow}>
          <div>
            <h3 className={s.serviceName}>{serviceName}</h3>
            <p className={s.providerLine}>{booking.providerName}</p>
          </div>
          <span className={cn(s.statusBase, statusClassName(booking.status))} role="status">
            {t(`status.${booking.status}`)}
          </span>
        </div>

        <ul className={s.meta}>
          <li className={s.metaItem}>
            <CalendarClock className={s.metaIcon} aria-hidden="true" />
            {format.dateTime(booking.startAt, {
              weekday: 'short',
              day: 'numeric',
              month: 'short',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </li>
          <li className={s.metaItem}>
            <User className={s.metaIcon} aria-hidden="true" />
            {booking.professionalName}
          </li>
          <li className={s.metaItem}>
            <MapPin className={s.metaIcon} aria-hidden="true" />
            {booking.providerAddress}
          </li>
        </ul>

        {booking.notes ? <p className={s.notes}>“{booking.notes}”</p> : null}

        <div className={s.footer}>
          <span className={s.price}>{priceFormatted}</span>
          <div className={s.actions}>
            {variant === 'pendingReview' ? (
              <Button size="lg" data-component={`customer-booking-review-${booking.id}`}>
                <Star className="size-4" aria-hidden="true" />
                {t('actions.review')}
              </Button>
            ) : null}

            {variant === 'upcoming' ? (
              <>
                {isCancelled ? (
                  <span className={s.blockedHint} role="status">
                    {t('actions.cancelledHint')}
                  </span>
                ) : (
                  <Button
                    variant="outline"
                    size="lg"
                    disabled={!cancellable || state === 'cancelling'}
                    onClick={requestCancel}
                    aria-label={t('actions.cancel')}
                    data-component={`customer-booking-cancel-${booking.id}`}
                  >
                    {state === 'cancelling' ? t('actions.cancelling') : t('actions.cancel')}
                  </Button>
                )}
                {!cancellable && !isCancelled ? (
                  <span className={s.blockedHint}>{t('actions.cancelBlockedHint')}</span>
                ) : null}
              </>
            ) : null}

            <Button asChild variant="ghost" size="lg">
              <Link href={`/centro/${booking.providerSlug}-${booking.providerId}`}>
                {t('actions.viewDetail')}
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </article>
  );
}
