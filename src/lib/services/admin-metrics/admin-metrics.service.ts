import 'server-only';

import { prisma } from '@/lib/db/prisma';
import { countProvidersByVerificationStatus } from '@/lib/services/verification';

import type { AdminMetric } from './admin-metrics.types';

/**
 * KPIs globales del dashboard admin.
 *
 * 4 métricas mínimas que dan una foto del estado de la plataforma:
 *  - `bookingsToday`: reservas creadas hoy (incluye pending/confirmed/
 *    completed; refleja actividad real del día).
 *  - `weeklyGmv`: GMV acumulado de bookings *completed* esta semana
 *    (lunes → ahora). Solo completed → es ingreso real, no promesas.
 *  - `pendingProviders`: providers en cola de verificación.
 *  - `cancellationRate`: % bookings cancelled vs total esta semana.
 *
 * Decisión MVP: `deltaPercent = 0` para todas. Calcular la delta
 * semanal requeriría dos queries adicionales por métrica y la
 * comparación con la semana anterior; lo dejamos como TODO de pulido
 * porque las cifras absolutas ya son útiles para el admin. La UI
 * pinta el chip en color neutro cuando es 0.
 */

/**
 * Calcula el inicio de "hoy" y el inicio de la semana actual en UTC.
 *
 * Usamos lunes 00:00 UTC como inicio de semana (no Madrid) para evitar
 * el desfase ±1-2h del timezone hasta que llegue la migración a
 * Temporal/luxon — coherente con el resto de cálculos del panel.
 */
function getDayAndWeekStart(now: Date): { todayStart: Date; weekStart: Date } {
  const todayStart = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0),
  );
  // `getUTCDay()` devuelve 0 para domingo, 6 para sábado. Convertimos
  // al offset desde el lunes (día 1) para alinear al inicio de semana
  // ISO 8601.
  const dayOfWeek = todayStart.getUTCDay();
  const daysSinceMonday = (dayOfWeek + 6) % 7;
  const weekStart = new Date(todayStart);
  weekStart.setUTCDate(weekStart.getUTCDate() - daysSinceMonday);
  return { todayStart, weekStart };
}

/**
 * Formatea céntimos a moneda EUR sin localización del símbolo (no
 * usamos `Intl` porque el server puede no tener el locale instalado en
 * runtime de edge/Vercel; el formato `1.234,50 €` con coma decimal y
 * punto de millares cumple con la convención ES/CA).
 */
function formatEur(cents: number): string {
  const euros = cents / 100;
  const fixed = euros.toFixed(2);
  const [intPart, decPart] = fixed.split('.');
  // Punto de millares cada 3 dígitos contando desde la derecha.
  const withThousands = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${withThousands},${decPart} €`;
}

/**
 * Devuelve los 4 KPIs globales calculados sobre BD real.
 *
 * Lanza 3 queries en paralelo (bookings, providers count, bookings
 * de la semana para tasa cancelación) para no penalizar la latencia
 * del dashboard.
 */
export async function getAdminMetrics(): Promise<AdminMetric[]> {
  const now = new Date();
  const { todayStart, weekStart } = getDayAndWeekStart(now);

  const [bookingsTodayCount, gmvAgg, statusCounts, weeklyStatusCounts] = await Promise.all([
    prisma.booking.count({
      where: { createdAt: { gte: todayStart } },
    }),
    prisma.booking.aggregate({
      where: {
        status: 'completed',
        completedAt: { gte: weekStart },
      },
      _sum: { priceCents: true },
    }),
    countProvidersByVerificationStatus(),
    prisma.booking.groupBy({
      by: ['status'],
      where: { createdAt: { gte: weekStart } },
      _count: { _all: true },
    }),
  ]);

  const weeklyGmvCents = gmvAgg._sum.priceCents ?? 0;

  // Tasa de cancelación: cancelled / total esta semana × 100.
  const totalThisWeek = weeklyStatusCounts.reduce((sum, row) => sum + row._count._all, 0);
  const cancelledThisWeek =
    weeklyStatusCounts.find((row) => row.status === 'cancelled')?._count._all ?? 0;
  const cancellationRatePercent =
    totalThisWeek === 0 ? 0 : Math.round((cancelledThisWeek / totalThisWeek) * 1000) / 10;

  return [
    {
      key: 'bookingsToday',
      value: String(bookingsTodayCount),
      deltaPercent: 0,
    },
    {
      key: 'weeklyGmv',
      value: formatEur(weeklyGmvCents),
      deltaPercent: 0,
    },
    {
      key: 'pendingProviders',
      value: String(statusCounts.pending),
      deltaPercent: 0,
    },
    {
      key: 'cancellationRate',
      // Forzamos 1 decimal y coma para alinearse con `4,2 %` del mock.
      value: `${cancellationRatePercent.toString().replace('.', ',')} %`,
      deltaPercent: 0,
    },
  ];
}
