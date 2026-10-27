import { notFound } from 'next/navigation';
import { hasLocale } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { BookingActionsList } from '@/components/features/provider-panel/BookingActionsList';
import type { PanelBookingAction } from '@/components/features/provider-panel/BookingActionsList';
import {
  PanelPreviewToggle,
  PreviewBanner,
} from '@/components/features/provider-panel/PanelPreviewToggle';
import {
  WeeklyCalendar,
  buildCalendarWeek,
} from '@/components/features/provider-panel/WeeklyCalendar';
import type { AppLocale } from '@/i18n/routing';
import { isPanelPreviewActive } from '@/lib/auth/panel-preview';
import { requireCurrentProvider } from '@/lib/auth/server';
import { fakePanelBookings } from '@/lib/fake-data/panel-bookings';
import { toIntlLocale } from '@/lib/i18n';
import { getPanelWeekBookings, toPreviewBookingActions } from '@/lib/services/provider-panel';
import { getMadridWeekRange, parseWeekParam } from '@/lib/utils/madrid-week';

interface PanelCalendarPageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ semana?: string | string[] }>;
}

/**
 * Calendario semanal del panel (`/panel/calendario?semana=YYYY-MM-DD`).
 *
 * La semana se elige por URL (clave del lunes, en hora de Madrid) para
 * que la navegación funcione sin JavaScript, se pueda compartir y el
 * «atrás» del navegador haga lo esperado. Sin parámetro, semana actual.
 *
 * Composición pura: el acceso a datos vive en `getPanelWeekBookings`
 * (§3 de CLAUDE.md — una página no habla con Prisma). Cada bloque del
 * calendario abre el detalle con sus acciones; debajo sigue el listado
 * de la semana, la vista accesible de lo mismo.
 *
 * En modo preview enseñamos datos de ejemplo con las acciones
 * deshabilitadas y sin navegación (los ejemplos no tienen fecha).
 */
export default async function PanelCalendarPage({ params, searchParams }: PanelCalendarPageProps) {
  const { locale } = await params;

  if (!hasLocale(['es', 'ca', 'en', 'de'], locale)) {
    notFound();
  }
  setRequestLocale(locale);

  const t = await getTranslations('providerPanel.calendar');
  const tPreview = await getTranslations('providerPanel.preview');
  const panelLocale = locale as AppLocale;
  const preview = await isPanelPreviewActive();
  const now = new Date();
  const weekKey = preview
    ? parseWeekParam(undefined, now)
    : parseWeekParam((await searchParams).semana, now);

  let bookings: PanelBookingAction[];
  if (preview) {
    bookings = toPreviewBookingActions(fakePanelBookings);
  } else {
    const { id: providerId } = await requireCurrentProvider(panelLocale);
    bookings = await getPanelWeekBookings(
      providerId,
      getMadridWeekRange(weekKey).start,
      panelLocale,
    );
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
      <WeeklyCalendar
        bookings={bookings}
        week={buildCalendarWeek(weekKey, now, toIntlLocale(panelLocale))}
        locale={panelLocale}
        readOnly={preview}
        now={now}
      />
      <BookingActionsList bookings={bookings} locale={panelLocale} readOnly={preview} now={now} />
    </section>
  );
}
