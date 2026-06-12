import { notFound } from 'next/navigation';
import { hasLocale } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import {
  PanelPreviewToggle,
  PreviewBanner,
} from '@/components/features/provider-panel/PanelPreviewToggle';
import { WeeklyCalendar } from '@/components/features/provider-panel/WeeklyCalendar';
import type {
  PanelBooking,
  PanelBookingStatus,
} from '@/components/features/provider-panel/WeeklyCalendar/WeeklyCalendar.types';
import type { AppLocale } from '@/i18n/routing';
import { requireCurrentProvider } from '@/lib/auth/server';
import { isPanelPreviewActive } from '@/lib/auth/panel-preview';
import { prisma } from '@/lib/db/prisma';
import { fakePanelBookings } from '@/lib/fake-data/panel-bookings';
import { pickLocalized } from '@/lib/i18n/pickLocalized';
import type { LocalizedText } from '@/types/domain';

interface PanelCalendarPageProps {
  params: Promise<{ locale: string }>;
}

/** Timezone fija para el panel: Yaiwell opera en España. */
const PANEL_TZ = 'Europe/Madrid';

/**
 * Calcula el rango de la semana actual en UTC.
 *
 * NOTA: usamos límites en UTC (no en hora local de Madrid) para
 * simplificar. Eso puede dejar fuera reservas en la hora 00:00-01:00
 * del lunes Madrid en invierno (1h de offset). Es aceptable para v1
 * — cuando llegue ICU/temporal-polyfill en Fase 1 se afina.
 */
function getCurrentWeekRange(now: Date): { start: Date; end: Date } {
  // `getUTCDay()`: 0=domingo .. 6=sábado. Convertimos a 0=lunes.
  const dayUTC = now.getUTCDay();
  const daysSinceMondayUTC = (dayUTC + 6) % 7;
  const start = new Date(now);
  start.setUTCHours(0, 0, 0, 0);
  start.setUTCDate(start.getUTCDate() - daysSinceMondayUTC);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 7);
  return { start, end };
}

/**
 * Devuelve el día de la semana en hora Madrid (0=lunes .. 6=domingo).
 *
 * Usa Intl con timeZone fija para que el cálculo no dependa de la
 * zona horaria del servidor (Vercel = UTC). Sin esto, una reserva
 * del lunes a las 00:30 Madrid se vería en la columna del domingo.
 */
function weekdayInMadrid(date: Date): 0 | 1 | 2 | 3 | 4 | 5 | 6 {
  const short = new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    timeZone: PANEL_TZ,
  }).format(date);
  const map: Record<string, 0 | 1 | 2 | 3 | 4 | 5 | 6> = {
    Mon: 0,
    Tue: 1,
    Wed: 2,
    Thu: 3,
    Fri: 4,
    Sat: 5,
    Sun: 6,
  };
  return map[short] ?? 0;
}

/** Formatea una fecha como "HH:mm" en hora Madrid. */
function timeInMadrid(date: Date): string {
  return new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: PANEL_TZ,
  }).format(date);
}

/**
 * Mapea el `BookingStatus` de BD al union restringido del panel.
 * `refunded` se trata visualmente como `cancelled` (un reembolso
 * sigue a una cancelación; no merece badge propio en el calendario).
 */
function mapStatus(
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'refunded',
): PanelBookingStatus {
  return status === 'refunded' ? 'cancelled' : status;
}

/**
 * Calendario semanal del panel (`/panel/calendario`).
 *
 * Consulta BD las reservas del proveedor en la semana en curso:
 *  - Booking filtrado por `providerId` + rango `startAt` semanal.
 *  - Join con `client` (User) para `clientName`.
 *  - Join con `service` para `serviceName` traducido.
 *  - Join con `professional` para `professionalName` (nullable).
 *
 * Para un provider sin reservas, la cuadrícula se renderiza vacía
 * (el componente ya maneja `bookings: []`).
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

  let bookings: PanelBooking[];
  if (preview) {
    bookings = fakePanelBookings;
  } else {
    const { id: providerId } = await requireCurrentProvider(panelLocale);
    const { start, end } = getCurrentWeekRange(new Date());

    const records = await prisma.booking.findMany({
      where: {
        providerId,
        startAt: { gte: start, lt: end },
      },
      select: {
        id: true,
        startAt: true,
        endAt: true,
        status: true,
        priceCents: true,
        client: { select: { fullName: true, email: true } },
        service: { select: { name: true } },
        professional: { select: { name: true } },
      },
      orderBy: { startAt: 'asc' },
    });

    bookings = records.map((r) => ({
      id: r.id,
      weekday: weekdayInMadrid(r.startAt),
      startTime: timeInMadrid(r.startAt),
      endTime: timeInMadrid(r.endAt),
      clientName: r.client.fullName ?? r.client.email,
      serviceName: pickLocalized(r.service.name as unknown as LocalizedText, panelLocale),
      professionalName: r.professional?.name ?? null,
      status: mapStatus(r.status),
      priceCents: r.priceCents,
    }));
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
      <WeeklyCalendar bookings={bookings} />
    </section>
  );
}
