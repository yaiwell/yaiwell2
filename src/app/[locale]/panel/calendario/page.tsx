import { notFound } from 'next/navigation';
import { hasLocale } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { WeeklyCalendar } from '@/components/features/provider-panel/WeeklyCalendar';
import { routing } from '@/i18n/routing';
import { fakePanelBookings } from '@/lib/fake-data/panel-bookings';

interface PanelCalendarPageProps {
  params: Promise<{ locale: string }>;
}

/**
 * Calendario semanal del panel (`/panel/calendario`).
 *
 * Server Component que pasa las reservas mock al componente
 * `WeeklyCalendar`, encargado de posicionar bloques sobre la
 * cuadrícula de hora × día.
 */
export default async function PanelCalendarPage({ params }: PanelCalendarPageProps) {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }
  setRequestLocale(locale);

  const t = await getTranslations('providerPanel.calendar');

  return (
    <section data-component="panel-calendar-page" className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="font-display text-foreground text-2xl">{t('title')}</h1>
        <p className="text-muted-foreground text-sm">{t('subtitle')}</p>
      </header>

      <WeeklyCalendar bookings={fakePanelBookings} />
    </section>
  );
}
