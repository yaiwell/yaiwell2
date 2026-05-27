/**
 * Métricas globales mock para el dashboard del panel admin.
 *
 * Valores fijos pensados para mostrar una foto plausible del estado
 * de la plataforma en la demo. Se acompañan de delta semanal para
 * ilustrar tendencia con un color (positivo / negativo).
 */

/**
 * Identifica cada KPI por una clave i18n estable. La UI lee el label
 * desde `adminArea.metrics.<key>` para evitar textos hardcodeados.
 */
export type AdminMetricKey =
  | 'bookingsToday'
  | 'weeklyGmv'
  | 'pendingProviders'
  | 'cancellationRate';

/**
 * KPI individual que pinta una card del dashboard.
 *
 * `value` es el texto ya formateado (ej. "1.243,50 €") para no acoplar
 * la maqueta a una lib de formateo concreta. `deltaPercent` es positivo
 * o negativo y la UI lo pinta en verde/rojo según signo.
 */
export interface AdminMetric {
  key: AdminMetricKey;
  value: string;
  deltaPercent: number;
}

/**
 * Snapshot fijo de métricas globales para la demo.
 *
 * Las cifras y el sentido del delta están pensados para contar una
 * narrativa concreta:
 *  - El producto está creciendo en reservas (+12% semanal).
 *  - El GMV acompaña al crecimiento (+9%).
 *  - Hay 5 proveedores en cola (consistente con `fakeAdminVerifications`).
 *  - La tasa de cancelación baja respecto a la semana anterior (-1.4 pp).
 */
export const fakeAdminMetrics: AdminMetric[] = [
  { key: 'bookingsToday', value: '84', deltaPercent: 12 },
  { key: 'weeklyGmv', value: '14.620 €', deltaPercent: 9 },
  { key: 'pendingProviders', value: '5', deltaPercent: 25 },
  { key: 'cancellationRate', value: '4,2 %', deltaPercent: -1.4 },
];
