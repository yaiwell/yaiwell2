import 'server-only';

import type {
  PanelBookingAction,
  PanelBookingActionStatus,
} from '@/components/features/provider-panel/BookingActionsList/BookingActionsList.types';
import type { PanelBooking } from '@/components/features/provider-panel/WeeklyCalendar/WeeklyCalendar.types';
import type { AppLocale } from '@/i18n/routing';
import { prisma } from '@/lib/db/prisma';
import { pickLocalized } from '@/lib/i18n/pickLocalized';
import {
  PANEL_TIMEZONE as PANEL_TZ,
  getMadridWeekRange,
  getMadridWeekStartKey,
} from '@/lib/utils/madrid-week';
import type { LocalizedText } from '@/types/domain';

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
 * Recupera las reservas del proveedor en una semana de Madrid (lunes
 * 00:00 a lunes 00:00, hora local) para `/panel/calendario`.
 *
 * Una única query con los joins necesarios (cliente, servicio,
 * profesional). La cuadrícula y el listado de acciones pintan el mismo
 * conjunto, así que comparten esta proyección.
 *
 * Devuelve también las ya resueltas de la semana: si la reserva
 * desapareciera al cancelar o completar, el proveedor no tendría
 * confirmación visible de que su acción ha aterrizado (ni de si el
 * reembolso salió). Los botones se deciden reserva a reserva por estado.
 *
 * @param providerId — Provider del usuario autenticado.
 * @param reference — cualquier instante de la semana a consultar.
 * @param locale — locale activo, para el nombre localizado del servicio.
 * @returns reservas de la semana ordenadas por inicio.
 */
export async function getPanelWeekBookings(
  providerId: string,
  reference: Date,
  locale: AppLocale,
): Promise<PanelBookingAction[]> {
  const { start, end } = getMadridWeekRange(getMadridWeekStartKey(reference));

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

  return records.map((r) => ({
    id: r.id,
    startAtIso: r.startAt.toISOString(),
    weekday: weekdayInMadrid(r.startAt),
    startTime: timeInMadrid(r.startAt),
    endTime: timeInMadrid(r.endAt),
    clientName: r.client.fullName ?? r.client.email,
    serviceName: pickLocalized(r.service.name as unknown as LocalizedText, locale),
    professionalName: r.professional?.name ?? null,
    status: r.status as PanelBookingActionStatus,
    priceCents: r.priceCents,
  }));
}

/**
 * Convierte las reservas de ejemplo del modo preview en filas del
 * listado de acciones.
 *
 * Los fixtures no tienen fecha real (solo día de la semana y `HH:mm`),
 * de ahí el `startAtIso: null`. Da igual: en preview la lista es
 * `readOnly` y ninguna acción llega a ejecutarse.
 */
export function toPreviewBookingActions(bookings: PanelBooking[]): PanelBookingAction[] {
  return bookings.map((b) => ({ ...b, startAtIso: null }));
}
