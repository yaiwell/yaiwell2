/**
 * Métricas ficticias del dashboard del proveedor.
 *
 * Cifras calibradas a un centro pequeño/medio de Barcelona durante una
 * semana laboral típica. Todo en céntimos para mantener coherencia con
 * el resto del catálogo (`Service.priceCents`).
 *
 * Valores fijos (no aleatorios) para que la demo sea determinista entre
 * renders y entre máquinas. En producción se calcularán desde las
 * tablas `Booking` y `Service` filtradas por proveedor y rango temporal.
 */

/** Punto de datos para la gráfica simple de ingresos por día. */
export interface PanelDailyRevenuePoint {
  /** Día abreviado (lunes a domingo) en clave i18n: `mon`, `tue`, etc. */
  dayKey: 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';
  revenueCents: number;
  bookingsCount: number;
}

/** Resumen de un servicio top del proveedor (ranking semanal). */
export interface PanelTopService {
  serviceId: string;
  /**
   * Nombre ya localizado para ahorrar lookups en la UI. Solo se rellenan
   * es/ca en fake data; en/de son opcionales y la UI hace fallback a es
   * vía `pickLocalized`.
   */
  name: { es: string; ca: string; en?: string; de?: string };
  bookingsCount: number;
  revenueCents: number;
}

/** Snapshot completo de métricas semanales mostradas en el dashboard. */
export interface PanelWeeklyMetrics {
  /** Ingresos totales de la semana en céntimos. */
  weekRevenueCents: number;
  /** Variación porcentual respecto a la semana anterior. */
  weekRevenueDeltaPct: number;
  /** Número total de reservas de la semana. */
  weekBookingsCount: number;
  weekBookingsDeltaPct: number;
  /** Ticket medio (revenue / bookings). */
  averageTicketCents: number;
  averageTicketDeltaPct: number;
  /** Ocupación: % de slots ocupados sobre el total disponible (0-100). */
  occupancyPct: number;
  occupancyDeltaPct: number;
  /** Serie diaria para la mini-gráfica. */
  dailyRevenue: PanelDailyRevenuePoint[];
  /** Top 4 servicios más reservados. */
  topServices: PanelTopService[];
}

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

/**
 * Devuelve el valor máximo de ingresos diarios de la serie semanal.
 *
 * Útil para escalar las barras de la mini-gráfica en porcentaje del
 * máximo, sin tener que recorrer la serie en el componente.
 */
export function getMaxDailyRevenueCents(metrics: PanelWeeklyMetrics): number {
  return metrics.dailyRevenue.reduce(
    (max, point) => (point.revenueCents > max ? point.revenueCents : max),
    0,
  );
}
