/**
 * Reexport del shape `AdminMetric` que ya consume `AdminMetricsGrid`.
 *
 * Mantenemos las mismas claves i18n (`bookingsToday`, `weeklyGmv`,
 * `pendingProviders`, `cancellationRate`) — la UI ya tiene los labels
 * traducidos en `adminArea.metrics.<key>` desde Fase 0.
 */

export type AdminMetricKey =
  | 'bookingsToday'
  | 'weeklyGmv'
  | 'pendingProviders'
  | 'cancellationRate';

export interface AdminMetric {
  key: AdminMetricKey;
  value: string;
  deltaPercent: number;
}
