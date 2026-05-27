import { useTranslations } from 'next-intl';

import { BookingCard } from '@/components/features/customer/BookingCard';

import { bookingsListStyles as s } from './BookingsList.styles';
import type { BookingsListProps } from './BookingsList.types';

/**
 * Listado de reservas del cliente agrupado en tres secciones:
 *
 *  1. Próximas reservas.
 *  2. Valoraciones pendientes (bookings `completed` sin review aún —
 *     §4.bis: solo se puede valorar si el provider las marcó completed).
 *  3. Historial (pasadas / canceladas / refunded / completadas reseñadas).
 *
 * Server Component: solo lee i18n y compone cards. Las cards son las
 * que llevan `'use client'` por la interacción de cancelación.
 */
export function BookingsList({ upcoming, past, pendingReview, now }: BookingsListProps) {
  const t = useTranslations('customerArea');

  return (
    <div className={s.root} data-component="customer-bookings-list">
      <section
        className={s.section}
        aria-labelledby="customer-bookings-upcoming-title"
        data-component="customer-bookings-section-upcoming"
      >
        <header className={s.sectionHeader}>
          <h2 id="customer-bookings-upcoming-title" className={s.sectionTitle}>
            {t('sections.upcoming.title')}
          </h2>
          <span className={s.sectionCount}>{t('sections.count', { count: upcoming.length })}</span>
        </header>
        {upcoming.length === 0 ? (
          <p className={s.empty}>{t('sections.upcoming.empty')}</p>
        ) : (
          <div className={s.grid}>
            {upcoming.map((booking) => (
              <BookingCard key={booking.id} booking={booking} variant="upcoming" now={now} />
            ))}
          </div>
        )}
      </section>

      <section
        className={s.section}
        aria-labelledby="customer-bookings-review-title"
        data-component="customer-bookings-section-review"
      >
        <header className={s.sectionHeader}>
          <h2 id="customer-bookings-review-title" className={s.sectionTitle}>
            {t('sections.pendingReview.title')}
          </h2>
          <span className={s.sectionCount}>
            {t('sections.count', { count: pendingReview.length })}
          </span>
        </header>
        {pendingReview.length === 0 ? (
          <p className={s.empty}>{t('sections.pendingReview.empty')}</p>
        ) : (
          <div className={s.grid}>
            {pendingReview.map((booking) => (
              <BookingCard key={booking.id} booking={booking} variant="pendingReview" now={now} />
            ))}
          </div>
        )}
      </section>

      <section
        className={s.section}
        aria-labelledby="customer-bookings-past-title"
        data-component="customer-bookings-section-past"
      >
        <header className={s.sectionHeader}>
          <h2 id="customer-bookings-past-title" className={s.sectionTitle}>
            {t('sections.past.title')}
          </h2>
          <span className={s.sectionCount}>{t('sections.count', { count: past.length })}</span>
        </header>
        {past.length === 0 ? (
          <p className={s.empty}>{t('sections.past.empty')}</p>
        ) : (
          <div className={s.grid}>
            {past.map((booking) => (
              <BookingCard key={booking.id} booking={booking} variant="past" now={now} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
