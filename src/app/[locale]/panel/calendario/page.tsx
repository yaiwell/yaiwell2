import { notFound } from 'next/navigation';
import { hasLocale } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { BookingActionsList } from '@/components/features/provider-panel/BookingActionsList';
import type { PanelBookingAction } from '@/components/features/provider-panel/BookingActionsList';
import {
  PanelPreviewToggle,
  PreviewBanner,
} from '@/components/features/provider-panel/PanelPreviewToggle';
import { WeeklyCalendar } from '@/components/features/provider-panel/WeeklyCalendar';
import type { PanelBooking } from '@/components/features/provider-panel/WeeklyCalendar/WeeklyCalendar.types';
import type { AppLocale } from '@/i18n/routing';
import { isPanelPreviewActive } from '@/lib/auth/panel-preview';
import { requireCurrentProvider } from '@/lib/auth/server';
import { fakePanelBookings } from '@/lib/fake-data/panel-bookings';
import { getPanelWeekBookings, toPreviewBookingActions } from '@/lib/services/provider-panel';

interface PanelCalendarPageProps {
  params: Promise<{ locale: string }>;
}

/**
 * Calendario semanal del panel (`/panel/calendario`).
 *
 * Composición pura: el acceso a datos vive en
 * `getPanelWeekBookings` (§3 de CLAUDE.md — una página no habla con
 * Prisma). Debajo de la cuadrícula va el listado de acciones, que es
 * por donde una reserva llega a `completed` o se cancela.
 *
 * En modo preview enseñamos los mismos bloques con datos de ejemplo y
 * las acciones deshabilitadas: la gracia del preview es ver el panel
 * lleno, no esconder la mitad de la pantalla.
 */
export default async function PanelCalendarPage({ params }: PanelCalendarPageProps) {
  const { locale } = await params;

  if (!hasLocale(['es', 'ca', 'en', 'de'], locale)) {
    notFound();
  }
  setRequestLocale(locale);

  const t = await getTranslations('providerPanel.calendar');
  const tPreview = await getTranslations('providerPanel.preview');
  const panelLocale = locale as AppLocale;
  const preview = await isPanelPreviewActive();

  let calendar: PanelBooking[];
  let actionable: PanelBookingAction[];
  if (preview) {
    calendar = fakePanelBookings;
    actionable = toPreviewBookingActions(fakePanelBookings);
  } else {
    const { id: providerId } = await requireCurrentProvider(panelLocale);
    ({ calendar, actionable } = await getPanelWeekBookings(providerId, new Date(), panelLocale));
  }

  return (
    <section data-component="panel-calendar-page" className="flex flex-col gap-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="font-display text-foreground text-2xl">{t('title')}</h1>
          <p className="text-muted-foreground text-sm">{t('subtitle')}</p>
        </div>
        <PanelPreviewToggle
          locale={panelLocale}
          active={preview}
          showLabel={tPreview('show')}
          hideLabel={tPreview('hide')}
          pendingLabel={tPreview('pending')}
        />
      </header>

      {preview ? <PreviewBanner /> : null}
      <WeeklyCalendar bookings={calendar} />
      <BookingActionsList bookings={actionable} locale={panelLocale} readOnly={preview} />
    </section>
  );
}
