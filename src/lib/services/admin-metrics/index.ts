/**
 * API pública del módulo `admin-metrics`.
 *
 * NO client-safe: el service importa Prisma. Solo callers server
 * (Server Component `/admin/page.tsx`).
 */

export { getAdminMetrics } from './admin-metrics.service';
export type { AdminMetric, AdminMetricKey } from './admin-metrics.types';
