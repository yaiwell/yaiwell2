import type { PanelWeeklyMetrics } from '@/lib/fake-data/panel-metrics';

/**
 * Locales soportados en la UI del panel.
 *
 * Replicamos el subset aquí para no acoplar el componente al tipo más
 * amplio de routing — si añadimos un idioma habrá que extenderlo.
 */
export type SupportedLocale = 'es' | 'ca';

/**
 * Props del bloque de métricas del dashboard. Recibe el snapshot
 * completo precomputado en el server para evitar lógica en el cliente.
 */
export interface DashboardMetricsProps {
  metrics: PanelWeeklyMetrics;
  locale: SupportedLocale;
}
