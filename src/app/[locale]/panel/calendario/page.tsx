import { notFound } from 'next/navigation';
import { hasLocale } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { BookingActionsList } from '@/components/features/provider-panel/BookingActionsList';
import type { PanelBookingAction } from '@/components/features/provider-panel/BookingActionsList';
import {
  FreeSlotsSection,
  type PanelFreeSlot,
} from '@/components/features/provider-panel/FreeSlotsSection';
import {
  PanelPreviewToggle,
  PreviewBanner,
} from '@/components/features/provider-panel/PanelPreviewToggle';
import {
  ReleaseSlotPromptProvider,
  type ReleaseSlotRequest,
} from '@/components/features/provider-panel/ReleaseSlotDialog';
import { ScheduleBlockDialog } from '@/components/features/provider-panel/ScheduleBlockDialog';
import {
  WeeklyCalendar,
  buildCalendarWeek,
  type PanelScheduleBlock,
  type PanelSlotOffer,
  type PanelTeamMember,
} from '@/components/features/provider-panel/WeeklyCalendar';
import type { AppLocale } from '@/i18n/routing';
import { isPanelPreviewActive } from '@/lib/auth/panel-preview';
import { requireCurrentProvider } from '@/lib/auth/server';
import { fakePanelBookings } from '@/lib/fake-data/panel-bookings';
import { fakePanelScheduleBlocks } from '@/lib/fake-data/panel-schedule-blocks';
import { fakePanelFreeSlots, fakePanelSlotOffers } from '@/lib/fake-data/panel-slot-offers';
import { fakePanelTeam } from '@/lib/fake-data/panel-team';
import { toIntlLocale } from '@/lib/i18n';
import {
  filterByProfessional,
  getPanelActiveTeam,
  getPanelReleasableFreeSlots,
  getPanelWeekBookings,
  getPanelWeekScheduleBlocks,
  getPanelWeekSlotOffers,
  resolveProfessionalFilter,
  toPreviewBookingActions,
} from '@/lib/services/provider-panel';
import { getMadridWeekRange, parseWeekParam } from '@/lib/utils/madrid-week';

interface PanelCalendarPageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{
    semana?: string | string[];
    liberar?: string | string[];
    pro?: string | string[];
  }>;
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
 * Encima del calendario, los huecos libres de las próximas 2 h que se
 * pueden liberar con descuento; en la cuadrícula, los ya liberados sin
 * vender. `ReleaseSlotPromptProvider` monta una sola vez el diálogo de
 * liberar hueco (también se abre tras cancelar una reserva).
 *
 * `?liberar=<bookingId>` (enlace del email «un cliente ha cancelado»)
 * abre al cargar el diálogo de liberar esa hora, solo si la reserva es de
 * esta semana y del centro (sale de su propia query) y sigue siendo
 * liberable. Si no, se ignora: el listado ya cuenta su estado.
 *
 * «Bloquear horas» (cabecera) marca un rango como no disponible; los
 * bloqueos de la semana se pintan rayados en la cuadrícula. El botón
 * no sale en modo preview: no hay negocio real que bloquear.
 *
 * Con más de un profesional activo, `?pro=<id>` filtra todo (citas,
 * ofertas, bloqueos y huecos libres) por profesional y preselecciona
 * ese profesional al bloquear horas. Un id que no es del equipo se
 * ignora. El filtro se aplica en los services, junto al `providerId`.
 *
 * En modo preview enseñamos datos de ejemplo con las acciones
 * deshabilitadas y sin navegación (los ejemplos no tienen fecha).
 */
export default async function PanelCalendarPage({ params, searchParams }: PanelCalendarPageProps) {
  const { locale } = await params;

  if (!hasLocale(['es', 'ca', 'en', 'de', 'fr'], locale)) {
    notFound();
  }
  setRequestLocale(locale);

  const t = await getTranslations('providerPanel.calendar');
  const tPreview = await getTranslations('providerPanel.preview');
  const panelLocale = locale as AppLocale;
  const preview = await isPanelPreviewActive();
  const now = new Date();
  const query = await searchParams;
  const weekKey = preview ? parseWeekParam(undefined, now) : parseWeekParam(query.semana, now);

  let team: PanelTeamMember[];
  let professionalId: string | null;
  let bookings: PanelBookingAction[];
  let slotOffers: PanelSlotOffer[];
  let freeSlots: PanelFreeSlot[];
  let scheduleBlocks: PanelScheduleBlock[];
  if (preview) {
    // El filtro también funciona con los ejemplos: así se ve cómo queda.
    team = fakePanelTeam;
    professionalId = resolveProfessionalFilter(query.pro, team);
    bookings = filterByProfessional(toPreviewBookingActions(fakePanelBookings), professionalId);
    slotOffers = filterByProfessional(fakePanelSlotOffers, professionalId);
    freeSlots = filterByProfessional(fakePanelFreeSlots, professionalId);
    scheduleBlocks = filterByProfessional(fakePanelScheduleBlocks, professionalId);
  } else {
    const { id: providerId } = await requireCurrentProvider(panelLocale);
    const weekStart = getMadridWeekRange(weekKey).start;
    // El equipo va antes: el filtro solo vale si el id es de este negocio.
    team = await getPanelActiveTeam(providerId);
    professionalId = resolveProfessionalFilter(query.pro, team);
    [bookings, slotOffers, freeSlots, scheduleBlocks] = await Promise.all([
      getPanelWeekBookings(providerId, weekStart, panelLocale, now, professionalId),
      getPanelWeekSlotOffers(providerId, weekStart, panelLocale, now, professionalId),
      getPanelReleasableFreeSlots(providerId, panelLocale, now, professionalId),
      getPanelWeekScheduleBlocks(providerId, weekKey, professionalId),
    ]);
  }
  const hasTeam = team.length > 1;

  const releaseRequest = preview ? null : findReleaseRequest(bookings, query.liberar);

  return (
    <section data-component="panel-calendar-page" className="flex flex-col gap-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="font-display text-foreground text-2xl">{t('title')}</h1>
          <p className="text-muted-foreground text-sm">{t('subtitle')}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {preview ? null : (
            <ScheduleBlockDialog
              locale={panelLocale}
              team={team}
              defaultProfessionalId={professionalId}
            />
          )}
          <PanelPreviewToggle
            locale={panelLocale}
            active={preview}
            showLabel={tPreview('show')}
            hideLabel={tPreview('hide')}
            pendingLabel={tPreview('pending')}
          />
        </div>
      </header>

      {preview ? <PreviewBanner /> : null}
      <ReleaseSlotPromptProvider locale={panelLocale} initialRequest={releaseRequest}>
        <FreeSlotsSection
          slots={freeSlots}
          readOnly={preview}
          showProfessional={hasTeam && professionalId === null}
        />
        <WeeklyCalendar
          bookings={bookings}
          slotOffers={slotOffers}
          scheduleBlocks={scheduleBlocks}
          week={buildCalendarWeek(weekKey, now, toIntlLocale(panelLocale))}
          locale={panelLocale}
          readOnly={preview}
          now={now}
          team={team}
          selectedProfessionalId={professionalId}
        />
        <BookingActionsList bookings={bookings} locale={panelLocale} readOnly={preview} now={now} />
      </ReleaseSlotPromptProvider>
    </section>
  );
}

/**
 * Petición de liberar la hora que pide el enlace `?liberar=<bookingId>`.
 *
 * Se busca entre las reservas ya cargadas para la semana del centro: un
 * id ajeno o inventado no aparece ahí, así que no hace falta otra query
 * ni otra comprobación de titularidad (y el servidor la repite al
 * liberar).
 */
function findReleaseRequest(
  bookings: PanelBookingAction[],
  raw: string | string[] | undefined,
): ReleaseSlotRequest | null {
  if (typeof raw !== 'string') return null;
  const booking = bookings.find((b) => b.id === raw);
  if (!booking?.releasable || !booking.startAtIso) return null;
  return { target: { kind: 'cancelled', bookingId: booking.id, startAtIso: booking.startAtIso } };
}
