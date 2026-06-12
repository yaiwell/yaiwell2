import type { LocalizedText } from '@/types/domain';

/**
 * Locales soportados en la UI del panel.
 *
 * Replicamos el subset aquí para no acoplar el componente al tipo más
 * amplio de routing — si añadimos un idioma habrá que extenderlo.
 */
export type SupportedLocale = 'es' | 'ca' | 'en' | 'de';

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
   * Nombre ya localizado para ahorrar lookups en la UI. en/de son
   * opcionales; la UI hace fallback a es vía `pickLocalized`.
   */
  name: LocalizedText;
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
 * Props del bloque de métricas del dashboard. Recibe el snapshot
 * completo precomputado en el server para evitar lógica en el cliente.
 */
export interface DashboardMetricsProps {
  metrics: PanelWeeklyMetrics;
  locale: SupportedLocale;
}
