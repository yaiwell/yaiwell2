import 'server-only';

import { isSentryEnabled } from '@/lib/integrations/sentry';

/**
 * Reporta a Sentry una incidencia de facturación que no debe cortar el
 * flujo (Customer huérfano, suscripción duplicada, precio desconocido).
 * Nunca lanza: la telemetría no puede tumbar un webhook ni un alta.
 *
 * @param err — error a registrar (tipado, con `code`).
 * @param providerId — negocio afectado, como tag para buscarlo.
 * @param extra — ids de Stripe útiles para que soporte actúe.
 */
export function reportBillingIssue(
  err: unknown,
  providerId: string,
  extra: Record<string, string | null> = {},
): void {
  const reason = err instanceof Error ? err.message : 'unknown';
  console.error(`[billing] ${reason}`, providerId, extra);
  if (!isSentryEnabled()) return;
  void import('@sentry/nextjs')
    .then((Sentry) => {
      Sentry.captureException(err, { tags: { domain: 'billing', providerId }, extra });
    })
    .catch(() => {
      // Sin Sentry solo queda el log de consola.
    });
}
