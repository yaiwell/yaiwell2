import 'server-only';

import type {
  PanelDailyRevenuePoint,
  PanelTopService,
  PanelWeeklyMetrics,
} from '@/components/features/provider-panel/DashboardMetrics/DashboardMetrics.types';
import { prisma } from '@/lib/db/prisma';
import type { LocalizedText } from '@/types/domain';

/** Timezone fija del panel: Yaiwell opera en España. */
const PANEL_TZ = 'Europe/Madrid';

/**
 * Estados de Booking que cuentan como "reserva real" para métricas.
 *
 * `pending` no cuenta porque aún no está confirmada (no hay compromiso
 * económico). `cancelled` y `refunded` no cuentan porque no generan
 * ingreso. `confirmed` y `completed` sí — la primera porque la pasarela
 * ya ha cobrado, la segunda porque además se prestó el servicio.
 */
const REVENUE_STATUSES = ['confirmed', 'completed'] as const;

const WEEKDAY_KEYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;
type WeekdayKey = (typeof WEEKDAY_KEYS)[number];

/**
 * Calcula el rango UTC de una semana relativa al lunes actual.
 *
 * `weeksAgo: 0` → semana en curso. `weeksAgo: 1` → semana anterior.
 *
 * NOTA: usamos límites en UTC para simplificar; eso desfasa el corte
 * en 1-2h respecto a Madrid pero es aceptable para v1. Cuando llegue
 * temporal-polyfill se ajusta al lunes 00:00 Madrid exacto.
 */
function weekRangeRelative(now: Date, weeksAgo: number): { start: Date; end: Date } {
  const dayUTC = now.getUTCDay();
  const daysSinceMondayUTC = (dayUTC + 6) % 7;
  const start = new Date(now);
  start.setUTCHours(0, 0, 0, 0);
  start.setUTCDate(start.getUTCDate() - daysSinceMondayUTC - weeksAgo * 7);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 7);
  return { start, end };
}

/**
 * Devuelve la clave de día (mon..sun) en hora Madrid de la fecha dada.
 * Sin esto, el agrupado diario se haría en UTC y desfasaría las
 * primeras horas del día respecto a la columna correcta.
 */
function weekdayKeyMadrid(date: Date): WeekdayKey {
  const short = new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    timeZone: PANEL_TZ,
  }).format(date);
  const map: Record<string, WeekdayKey> = {
    Mon: 'mon',
    Tue: 'tue',
    Wed: 'wed',
    Thu: 'thu',
    Fri: 'fri',
    Sat: 'sat',
    Sun: 'sun',
  };
  return map[short] ?? 'mon';
}

/**
 * Calcula la variación porcentual con redondeo a 1 decimal.
 *
 * Reglas de borde:
 *  - Ambas 0 → 0% (no hay cambio).
 *  - Previo 0 y actual > 0 → 100% (consideramos "crecimiento total"
 *    para evitar `Infinity`; el componente lo formatea como "+100%").
 */
function computeDeltaPct(current: number, previous: number): number {
  if (previous === 0) return current === 0 ? 0 : 100;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

/**
 * Computa el snapshot semanal de métricas del provider.
 *
 * Una sola query Prisma trae bookings de la semana actual + anterior;
 * el agregado se hace en memoria para evitar 4+ queries separadas
 * (revenue, count, daily, topServices) en un mismo request del panel.
 *
 * Para un provider sin reservas devuelve un snapshot con todo a 0
 * (incluidos los deltas) y `dailyRevenue` con los 7 días en 0.
 */
export async function getWeeklyMetrics(providerId: string): Promise<PanelWeeklyMetrics> {
  const now = new Date();
  const thisWeek = weekRangeRelative(now, 0);
  const lastWeek = weekRangeRelative(now, 1);

  const bookings = await prisma.booking.findMany({
    where: {
      providerId,
      startAt: { gte: lastWeek.start, lt: thisWeek.end },
      status: { in: [...REVENUE_STATUSES] },
    },
    select: {
      startAt: true,
      priceCents: true,
      serviceId: true,
      service: { select: { name: true } },
    },
  });

  // Partición de la única query en las dos ventanas semanales.
  const thisWeekBookings = bookings.filter((b) => b.startAt >= thisWeek.start);
  const lastWeekBookings = bookings.filter((b) => b.startAt < thisWeek.start);

  const thisRevenue = thisWeekBookings.reduce((sum, b) => sum + b.priceCents, 0);
  const lastRevenue = lastWeekBookings.reduce((sum, b) => sum + b.priceCents, 0);

  const thisCount = thisWeekBookings.length;
  const lastCount = lastWeekBookings.length;

  const thisAvgTicket = thisCount > 0 ? Math.round(thisRevenue / thisCount) : 0;
  const lastAvgTicket = lastCount > 0 ? Math.round(lastRevenue / lastCount) : 0;

  // Agregado diario para la mini-gráfica.
  const dailyAgg = new Map<WeekdayKey, { revenueCents: number; bookingsCount: number }>();
  for (const b of thisWeekBookings) {
    const key = weekdayKeyMadrid(b.startAt);
    const acc = dailyAgg.get(key) ?? { revenueCents: 0, bookingsCount: 0 };
    acc.revenueCents += b.priceCents;
    acc.bookingsCount += 1;
    dailyAgg.set(key, acc);
  }
  const dailyRevenue: PanelDailyRevenuePoint[] = WEEKDAY_KEYS.map((dayKey) => ({
    dayKey,
    revenueCents: dailyAgg.get(dayKey)?.revenueCents ?? 0,
    bookingsCount: dailyAgg.get(dayKey)?.bookingsCount ?? 0,
  }));

  // Top servicios por número de reservas (desempata el de más ingresos).
  const serviceAgg = new Map<
    string,
    { name: LocalizedText; bookingsCount: number; revenueCents: number }
  >();
  for (const b of thisWeekBookings) {
    const acc = serviceAgg.get(b.serviceId) ?? {
      name: b.service.name as unknown as LocalizedText,
      bookingsCount: 0,
      revenueCents: 0,
    };
    acc.bookingsCount += 1;
    acc.revenueCents += b.priceCents;
    serviceAgg.set(b.serviceId, acc);
  }
  const topServices: PanelTopService[] = Array.from(serviceAgg.entries())
    .sort((a, b) => {
      if (b[1].bookingsCount !== a[1].bookingsCount) {
        return b[1].bookingsCount - a[1].bookingsCount;
      }
      return b[1].revenueCents - a[1].revenueCents;
    })
    .slice(0, 4)
    .map(([serviceId, v]) => ({
      serviceId,
      name: v.name,
      bookingsCount: v.bookingsCount,
      revenueCents: v.revenueCents,
    }));

  return {
    weekRevenueCents: thisRevenue,
    weekRevenueDeltaPct: computeDeltaPct(thisRevenue, lastRevenue),
    weekBookingsCount: thisCount,
    weekBookingsDeltaPct: computeDeltaPct(thisCount, lastCount),
    averageTicketCents: thisAvgTicket,
    averageTicketDeltaPct: computeDeltaPct(thisAvgTicket, lastAvgTicket),
    // Ocupación queda en 0 hasta que tengamos un cálculo basado en
    // Professional.schedule (horas trabajables) vs. horas reservadas.
    // Fase 1: derivar de horario semanal del profesional × días.
    occupancyPct: 0,
    occupancyDeltaPct: 0,
    dailyRevenue,
    topServices,
  };
}
