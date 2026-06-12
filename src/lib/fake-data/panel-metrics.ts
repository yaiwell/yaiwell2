/**
 * Métricas ficticias del dashboard del proveedor.
 *
 * El dashboard real (`/panel`) ya computa estos números desde BD desde
 * 2026-06-12 vía `dashboard-metrics.service`. Este módulo se mantiene
 * como **fixture de tests** del componente `DashboardMetrics`; los
 * tipos viven junto al componente que los consume.
 */

import type {
  PanelDailyRevenuePoint,
  PanelTopService,
  PanelWeeklyMetrics,
} from '@/components/features/provider-panel/DashboardMetrics/DashboardMetrics.types';
import { getMaxDailyRevenueCents } from '@/components/features/provider-panel/DashboardMetrics/DashboardMetrics.logic';

// Re-export para no romper imports antiguos.
export type { PanelDailyRevenuePoint, PanelTopService, PanelWeeklyMetrics };
export { getMaxDailyRevenueCents };

/**
 * Métricas semanales del proveedor activo (mock — siempre `prov-01`).
 *
 * Los deltas positivos representan crecimiento; negativos, caída.
 * El total `weekRevenueCents` coincide con la suma de `dailyRevenue`
 * para que la mini-gráfica cuadre visualmente con el KPI principal.
 */
export const fakePanelWeeklyMetrics: PanelWeeklyMetrics = {
  weekRevenueCents: 348_500,
  weekRevenueDeltaPct: 12.4,
  weekBookingsCount: 47,
  weekBookingsDeltaPct: 8.2,
  averageTicketCents: 7415,
  averageTicketDeltaPct: 3.9,
  occupancyPct: 78,
  occupancyDeltaPct: 5.1,
  dailyRevenue: [
    { dayKey: 'mon', revenueCents: 42_500, bookingsCount: 6 },
    { dayKey: 'tue', revenueCents: 51_000, bookingsCount: 7 },
    { dayKey: 'wed', revenueCents: 38_000, bookingsCount: 5 },
    { dayKey: 'thu', revenueCents: 62_500, bookingsCount: 8 },
    { dayKey: 'fri', revenueCents: 71_500, bookingsCount: 9 },
    { dayKey: 'sat', revenueCents: 65_000, bookingsCount: 8 },
    { dayKey: 'sun', revenueCents: 18_000, bookingsCount: 4 },
  ],
  topServices: [
    {
      serviceId: 'svc-01',
      name: { es: 'Corte mujer', ca: 'Tall dona' },
      bookingsCount: 14,
      revenueCents: 77_000,
    },
    {
      serviceId: 'svc-03',
      name: { es: 'Color completo', ca: 'Color complet' },
      bookingsCount: 9,
      revenueCents: 85_500,
    },
    {
      serviceId: 'svc-02',
      name: { es: 'Corte hombre', ca: 'Tall home' },
      bookingsCount: 12,
      revenueCents: 45_600,
    },
    {
      serviceId: 'svc-04',
      name: { es: 'Peinado evento', ca: 'Pentinat esdeveniment' },
      bookingsCount: 4,
      revenueCents: 26_000,
    },
  ],
};
