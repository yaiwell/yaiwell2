/**
 * Alerta de no presentados por negocio (CLAUDE.md §4.bis, antiabuso
 * decidido 2026-10-30).
 *
 * Si un negocio marca demasiados «no presentado» en reservas con pago en
 * el local, puede estar sancionando a clientes que sí fueron (o usando la
 * marca para no pagar comisión). No se bloquea nada automáticamente:
 * se avisa a soporte en Sentry para que lo revise.
 */

import { isSentryEnabled } from '@/lib/integrations/sentry';
import { getMadridDateKey } from '@/lib/utils/madrid-week';

import { sanctionsRepository } from './sanctions.repository';

/** Días hacia atrás (por inicio de la reserva) que se miran. */
export const NO_SHOW_ALERT_WINDOW_DAYS = 30;

/** Mínimo de reservas en el local ya empezadas para que la tasa signifique algo. */
export const NO_SHOW_ALERT_MIN_BOOKINGS = 5;

/** Tasa que hay que **superar** (estrictamente) para avisar. */
export const NO_SHOW_ALERT_RATE_THRESHOLD = 0.2;

const DAY_MS = 24 * 60 * 60 * 1000;

/** Recuento de reservas en el local ya empezadas de un negocio. */
export interface OnsiteNoShowStats {
  total: number;
  noShows: number;
}

/**
 * Si la tasa de no presentados de un negocio merece aviso: al menos 5
 * reservas en el local ya empezadas y más del 20 % no presentadas (un
 * 20 % justo no avisa).
 *
 * @param stats — recuento de los últimos 30 días.
 */
export function shouldAlertNoShowRate(stats: OnsiteNoShowStats): boolean {
  if (stats.total < NO_SHOW_ALERT_MIN_BOOKINGS) return false;
  return stats.noShows / stats.total > NO_SHOW_ALERT_RATE_THRESHOLD;
}

/**
 * Tras marcar un no presentado en el local, revisa la tasa del negocio
 * en los últimos 30 días y avisa a Sentry si se pasa.
 *
 * **Nunca lanza**: va fuera de la transacción del marcado y un fallo
 * aquí (BD, Sentry) solo deja un log; la acción del negocio ya se hizo.
 *
 * Sin columna para recordar el último aviso: el `fingerprint` agrupa en
 * Sentry los eventos del mismo negocio y día (Madrid) en una sola
 * incidencia, así que la alerta «incidencia nueva» salta como mucho una
 * vez por negocio y día. Los marcados siguientes de ese día solo suman
 * eventos a la misma incidencia.
 *
 * El aviso no lleva datos del cliente: solo el negocio y las cifras.
 *
 * @param providerId — negocio que acaba de marcar el no presentado.
 * @param now — instante de referencia; inyectable para tests.
 */
export async function checkProviderNoShowRate(
  providerId: string,
  now: Date = new Date(),
): Promise<void> {
  try {
    const since = new Date(now.getTime() - NO_SHOW_ALERT_WINDOW_DAYS * DAY_MS);
    const stats = await sanctionsRepository.countOnsiteStartedSince(providerId, since, now);
    if (!shouldAlertNoShowRate(stats)) return;
    await reportHighNoShowRate(providerId, stats, getMadridDateKey(now));
  } catch (error) {
    console.error('[sanctions] no-show rate check failed:', providerId, error);
  }
}

/** Envía el aviso a Sentry (o solo a consola si Sentry está apagado). */
async function reportHighNoShowRate(
  providerId: string,
  stats: OnsiteNoShowStats,
  dateKey: string,
): Promise<void> {
  const ratePct = Math.round((stats.noShows / stats.total) * 1000) / 10;
  const message = `High onsite no-show rate: ${stats.noShows}/${stats.total} (${ratePct}%) in ${NO_SHOW_ALERT_WINDOW_DAYS} days`;
  console.warn(`[sanctions] ${message}`, providerId);
  if (!isSentryEnabled()) return;
  const Sentry = await import('@sentry/nextjs');
  Sentry.captureMessage(message, {
    level: 'warning',
    tags: { domain: 'sanctions', providerId },
    extra: { noShows: stats.noShows, total: stats.total, ratePct, dateKey },
    fingerprint: ['onsite-no-show-rate', providerId, dateKey],
  });
}
