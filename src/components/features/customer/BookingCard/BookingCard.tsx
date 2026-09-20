import { CalendarClock, MapPin, Star, User } from 'lucide-react';
import { useFormatter, useLocale, useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';
import type { AppLocale } from '@/i18n/routing';
import { pickLocalized } from '@/lib/i18n';
import { cn } from '@/lib/utils';

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
 *  - `upcoming`: aviso de cómo cancelar + "Ver detalle".
 *  - `past`: solo botón "Ver detalle".
 *  - `pendingReview`: CTA primario "Valorar" + "Ver detalle".
 *
 * Server Component: desde que el cobro es real no hay ninguna acción
 * interactiva en la card. El botón "Cancelar" que existía aquí era una
 * simulación sin backend — pintaba "Cancelación solicitada" sobre una
 * reserva pagada que seguía en pie, así que se retiró. La política de
 * cancelación por parte del cliente sigue pendiente de definir
 * (§4.bis de CLAUDE.md); hasta entonces la cancelación se gestiona por
 * soporte y aquí solo se informa de ello.
 */
export function BookingCard({ booking, variant }: BookingCardProps) {
  const t = useTranslations('customerArea');
  const locale = useLocale();
  const format = useFormatter();

  // El nombre del servicio viene del dominio (`LocalizedText`) y se
  // resuelve aquí según el locale activo para evitar lookups en JSX.
  const serviceName = pickLocalized(booking.serviceName, locale as AppLocale);
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
              // El botón de cancelar del cliente se retiró: no llamaba a
              // ninguna API y con el cobro ya real le decía a quien reservó
              // que había cancelado algo que seguía en pie. La política de
              // cancelación por cliente sigue sin definirse (§4.bis), así
              // que hasta entonces la vía es soporte.
              <span
                className={s.blockedHint}
                data-component={`customer-booking-cancel-hint-${booking.id}`}
              >
                {t('actions.cancelSupportHint')}
              </span>
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
