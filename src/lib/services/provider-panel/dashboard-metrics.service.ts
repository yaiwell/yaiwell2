import 'server-only';

import type { Prisma } from '@prisma/client';

import type {
  PanelDailyRevenuePoint,
  PanelTopService,
  PanelWeeklyMetrics,
} from '@/components/features/provider-panel/DashboardMetrics/DashboardMetrics.types';
import { prisma } from '@/lib/db/prisma';
import { weeklyScheduleSchema } from '@/lib/services/availability/availability.validation';
// Ruta directa: el barrel de schedule-blocks arrastra el servicio entero.
import { scheduleBlocksRepository } from '@/lib/services/schedule-blocks/schedule-blocks.repository';
import {
  PANEL_TIMEZONE as PANEL_TZ,
  addDaysToDateKey,
  getMadridWeekRange,
  getMadridWeekStartKey,
} from '@/lib/utils/madrid-week';
import type { LocalizedText } from '@/types/domain';

import { computeTeamOccupancyPct, type TeamMemberOccupancyInput } from './dashboard-occupancy';

/**
 * Estados de Booking que cuentan como "reserva real" para métricas.
 *
 * `pending` no cuenta porque aún no está confirmada (no hay compromiso
 * económico). `cancelled` y `refunded` no cuentan porque no generan
 * ingreso. `confirmed` y `completed` sí — la primera porque la pasarela
 * ya ha cobrado (o, en el local, hay compromiso firme), la segunda porque
 * además se prestó el servicio.
 *
 * `no_show` (migración 9f) solo cuenta si se pagó online: el negocio se
 * queda el cobro (§4.bis). En el local no cobró nada.
 */
const REVENUE_STATUSES = ['confirmed', 'completed'] as const;

/** Filtro de "reserva que genera ingreso" según la regla de arriba. */
const REVENUE_WHERE: Prisma.BookingWhereInput = {
  OR: [{ status: { in: [...REVENUE_STATUSES] } }, { status: 'no_show', paymentMode: 'online' }],
};

const WEEKDAY_KEYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;
type WeekdayKey = (typeof WEEKDAY_KEYS)[number];

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
  // Semanas de lunes a lunes en hora de Madrid: cortar en UTC dejaba
  // fuera las reservas de la primera hora del lunes.
  const thisWeekKey = getMadridWeekStartKey(new Date());
  const thisWeek = getMadridWeekRange(thisWeekKey);
  const lastWeek = getMadridWeekRange(addDaysToDateKey(thisWeekKey, -7));

  const [bookings, professionals, blocks] = await Promise.all([
    prisma.booking.findMany({
      where: {
        providerId,
        startAt: { gte: lastWeek.start, lt: thisWeek.end },
        ...REVENUE_WHERE,
      },
      select: {
        startAt: true,
        endAt: true,
        priceCents: true,
        serviceId: true,
        professionalId: true,
        service: { select: { name: true } },
      },
    }),
    // La capacidad del negocio es la suma de la de cada profesional activo.
    prisma.professional.findMany({
      where: { providerId, deletedAt: null },
      select: { id: true, schedule: true },
    }),
    scheduleBlocksRepository.findForProviderRange(providerId, lastWeek.start, thisWeek.end),
  ]);

  // Partición de la única query en las dos ventanas semanales.
  const thisWeekBookings = bookings.filter((b) => b.startAt >= thisWeek.start);
  const lastWeekBookings = bookings.filter((b) => b.startAt < thisWeek.start);

  const thisRevenue = thisWeekBookings.reduce((sum, b) => sum + b.priceCents, 0);
  const lastRevenue = lastWeekBookings.reduce((sum, b) => sum + b.priceCents, 0);

  const thisCount = thisWeekBookings.length;
  const lastCount = lastWeekBookings.length;

  const thisAvgTicket = thisCount > 0 ? Math.round(thisRevenue / thisCount) : 0;
  const lastAvgTicket = lastCount > 0 ? Math.round(lastRevenue / lastCount) : 0;

  // Ocupación del equipo: horas reservadas entre horas abiertas (menos
  // bloqueos), sumando por profesional. Uno sin horario válido no aporta
  // capacidad (ni sus reservas): no se puede saber cuánto tenía abierto.
  const occupancyFor = (weekStartKey: string, weekBookings: typeof bookings) => {
    const members: TeamMemberOccupancyInput[] = [];
    for (const professional of professionals) {
      const schedule = weeklyScheduleSchema.safeParse(professional.schedule);
      if (!schedule.success) continue;
      members.push({
        schedule: schedule.data,
        bookings: weekBookings.filter((b) => b.professionalId === professional.id),
        blocks: blocks.filter((b) => b.professionalId === professional.id),
      });
    }
    return computeTeamOccupancyPct(members, weekStartKey);
  };
  const thisOccupancy = occupancyFor(thisWeekKey, thisWeekBookings);
  const lastOccupancy = occupancyFor(addDaysToDateKey(thisWeekKey, -7), lastWeekBookings);

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
    occupancyPct: thisOccupancy,
    occupancyDeltaPct: computeDeltaPct(thisOccupancy, lastOccupancy),
    dailyRevenue,
    topServices,
  };
}
