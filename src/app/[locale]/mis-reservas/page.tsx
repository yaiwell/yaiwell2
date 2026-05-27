import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { hasLocale } from 'next-intl';

import { BookingsList, splitBookings } from '@/components/features/customer';
import { routing } from '@/i18n/routing';
import { fakeCustomerBookings, getBookingsReferenceNow } from '@/lib/fake-data/customer-bookings';

interface CustomerBookingsPageProps {
  // En Next.js 16 los `params` son Promises.
  params: Promise<{ locale: string }>;
}

/**
 * Página `/mis-reservas` del área cliente.
 *
 * Server Component que:
 *  1. Valida el locale.
 *  2. Lee la lista de reservas fake y las parte en tres grupos.
 *  3. Pasa los grupos al componente presentacional `BookingsList`.
 *
 * La regla de §4.bis sobre "solo se puede valorar tras `completed`"
 * se aplica en `splitBookings`: la sección de "valoraciones pendientes"
 * solo recoge bookings con `status === 'completed' && !hasReview`.
 */
export default async function CustomerBookingsPage({ params }: CustomerBookingsPageProps) {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }
  setRequestLocale(locale);

  const t = await getTranslations('customerArea');
  const now = getBookingsReferenceNow();
  const { upcoming, past, pendingReview } = splitBookings(fakeCustomerBookings, now);

  return (
    <div data-component="customer-bookings-page" className="flex flex-col gap-8">
      <header className="flex flex-col gap-2">
        <h1 className="font-display text-foreground text-3xl leading-tight sm:text-4xl">
          {t('page.title')}
        </h1>
        <p className="text-muted-foreground max-w-xl text-sm">{t('page.subtitle')}</p>
      </header>

      <BookingsList upcoming={upcoming} past={past} pendingReview={pendingReview} now={now} />
    </div>
  );
}
