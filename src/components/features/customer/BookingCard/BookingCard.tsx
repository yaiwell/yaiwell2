import { CalendarClock, MapPin, User } from 'lucide-react';
import { useFormatter, useLocale, useTranslations } from 'next-intl';

import { ExistingReview } from '@/components/features/customer/ExistingReview';
import { ReviewDialog } from '@/components/features/customer/ReviewForm';
import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';
import type { AppLocale } from '@/i18n/routing';
import { pickLocalized } from '@/lib/i18n';
import { cn } from '@/lib/utils';

import { BookingCancellationAction } from './BookingCancellationAction';
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
 *  - `upcoming`: "Cancelar reserva" (o el motivo por el que no se puede)
 *    + "Ver detalle".
 *  - `past`: solo botón "Ver detalle".
 *  - `pendingReview`: CTA primario "Valorar" + "Ver detalle".
 *
 * Lo relativo a valorar no depende de la variante sino de lo que calcula
 * el servicio: CTA solo con `canReview`, la reseña propia si existe y un
 * aviso discreto si el plazo de 30 días ya venció (§4.bis).
 *
 * Server Component: lo interactivo (el diálogo de valoración y el
 * "Ver más" de la reseña) vive en Client Components hijos.
 *
 * Cancelación (§4.bis, decidido 2026-10-29): lo que se ofrece lo decide
 * el servidor en `booking.cancellation` con las mismas reglas que la
 * action (última hora nunca, hasta 2 h antes). La card solo elige qué
 * pintar; el botón y su diálogo son un Client Component.
 */
export function BookingCard({ booking, variant }: BookingCardProps) {
  const t = useTranslations('customerArea');
  const locale = useLocale();
  const format = useFormatter();

  // El nombre del servicio viene del dominio (`LocalizedText`) y se
  // resuelve aquí según el locale activo para evitar lookups en JSX.
  const serviceName = pickLocalized(booking.serviceName, locale as AppLocale);
  const whenFormatted = format.dateTime(booking.startAt, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
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
        {/* Un proveedor puede no tener fotos todavía: en ese caso no
            renderizamos `<img>` (un `src=""` dispara una segunda
            petición a la propia página) y dejamos el fondo `bg-muted`
            del contenedor como placeholder. */}
        {booking.providerPhoto ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={booking.providerPhoto}
            alt=""
            aria-hidden="true"
            className={s.image}
            loading="lazy"
          />
        ) : null}
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
            {whenFormatted}
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

        {booking.review ? (
          <ExistingReview
            bookingId={booking.id}
            rating={booking.review.rating}
            text={booking.review.text}
          />
        ) : null}

        {booking.reviewWindowClosed ? (
          <p
            className={s.blockedHint}
            data-component={`customer-booking-review-closed-${booking.id}`}
          >
            {t('actions.reviewWindowClosed')}
          </p>
        ) : null}

        <div className={s.footer}>
          <span className={s.price}>{priceFormatted}</span>
          <div className={s.actions}>
            {booking.canReview ? (
              <ReviewDialog
                bookingId={booking.id}
                serviceName={serviceName}
                providerName={booking.providerName}
              />
            ) : null}

            {variant === 'upcoming' ? (
              <BookingCancellationAction
                booking={booking}
                serviceName={serviceName}
                whenLabel={whenFormatted}
                amountLabel={priceFormatted}
              />
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
