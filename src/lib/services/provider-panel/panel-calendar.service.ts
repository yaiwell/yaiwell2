import 'server-only';

import type {
  PanelBookingAction,
  PanelBookingActionStatus,
} from '@/components/features/provider-panel/BookingActionsList/BookingActionsList.types';
import type {
  PanelBooking,
  PanelBookingStatus,
} from '@/components/features/provider-panel/WeeklyCalendar/WeeklyCalendar.types';
import type { AppLocale } from '@/i18n/routing';
import { prisma } from '@/lib/db/prisma';
import { pickLocalized } from '@/lib/i18n/pickLocalized';
import type { LocalizedText } from '@/types/domain';

/** Timezone fija para el panel: Yaiwell opera en España. */
const PANEL_TZ = 'Europe/Madrid';

/**
 * Las dos proyecciones que el panel de calendario necesita, resueltas
 * con una sola query.
 *
 * `calendar` alimenta la cuadrícula semanal (hora local ya formateada,
 * estado colapsado). `actionable` alimenta el listado de acciones, que
 * necesita el instante real (`startAtIso`) para la ventana de 2 h y el
 * estado sin colapsar para distinguir `cancelled` de `refunded`.
 */
export interface PanelWeekBookings {
  calendar: PanelBooking[];
  actionable: PanelBookingAction[];
}

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
 * Mapea el `BookingStatus` de BD al union restringido del calendario.
 * `refunded` se trata visualmente como `cancelled` (un reembolso
 * sigue a una cancelación; no merece badge propio en la cuadrícula).
 */
function mapStatus(status: PanelBookingActionStatus): PanelBookingStatus {
  return status === 'refunded' ? 'cancelled' : status;
}

/**
 * Recupera las reservas del proveedor en la semana en curso y devuelve
 * las dos proyecciones que consume `/panel/calendario`.
 *
 * Una única query con los joins necesarios (cliente, servicio,
 * profesional): las dos vistas pintan exactamente el mismo conjunto de
 * reservas, así que duplicar el viaje a BD solo añadiría latencia y
 * riesgo de inconsistencia entre cuadrícula y listado.
 *
 * @param providerId — Provider del usuario autenticado.
 * @param now — momento de referencia; determina la semana consultada.
 *   Se recibe por parámetro para poder testear sin congelar el reloj.
 * @param locale — locale activo, necesario para resolver el nombre
 *   localizado del servicio (`LocalizedText`).
 * @returns cuadrícula semanal y listado de acciones.
 */
export async function getPanelWeekBookings(
  providerId: string,
  now: Date,
  locale: AppLocale,
): Promise<PanelWeekBookings> {
  const { start, end } = getCurrentWeekRange(now);

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

  // Proyección intermedia: los campos comunes a ambas vistas más el
  // `startAt` crudo, que solo el listado de acciones necesita.
  const rows = records.map((r) => ({
    startAt: r.startAt,
    common: {
      id: r.id,
      weekday: weekdayInMadrid(r.startAt),
      startTime: timeInMadrid(r.startAt),
      endTime: timeInMadrid(r.endAt),
      clientName: r.client.fullName ?? r.client.email,
      serviceName: pickLocalized(r.service.name as unknown as LocalizedText, locale),
      professionalName: r.professional?.name ?? null,
      status: r.status as PanelBookingActionStatus,
      priceCents: r.priceCents,
    },
  }));

  return {
    calendar: rows.map(({ common }) => ({
      ...common,
      status: mapStatus(common.status),
    })),
    // Devolvemos también las ya resueltas de la semana: si la fila
    // desapareciera al cancelar o completar, el proveedor no tendría
    // confirmación visible de que su acción ha aterrizado (ni de si el
    // reembolso salió). Los botones se deciden fila a fila por estado.
    actionable: rows.map(({ startAt, common }) => ({
      ...common,
      startAtIso: startAt.toISOString(),
    })),
  };
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
