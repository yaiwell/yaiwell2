import 'server-only';

import { EmailConfigError, EmailSendError, sendEmail } from '@/lib/integrations/email';
import { isSentryEnabled } from '@/lib/integrations/sentry/sentry.shared';

import { renderEmailHtml, renderEmailText } from './notifications.layout';
import type { EmailContent, EmailRecipient } from './notifications.types';

/**
 * Direcciones de prueba que nunca deben recibir correo real: los E2E y
 * la semilla crean usuarios ficticios y usan la `RESEND_API_KEY` de
 * `.env.local`; cada rebote resta reputación al dominio.
 */
export function isTestAddress(email: string): boolean {
  const lower = email.toLowerCase();
  return (
    lower.includes('+clerk_test') ||
    /@example\.(com|org|net)$/.test(lower) ||
    // Dominios reservados (RFC 2606/6761): usuarios semilla como `dev-client@yaiwell.local`.
    /\.(local|test|invalid|example|localhost)$/.test(lower)
  );
}

/**
 * Esperas antes de cada reintento ante un fallo pasajero de Resend (límite
 * de envíos o error del servidor). Cortas: el envío corre tras responder
 * (`after`) o dentro del cron, y ninguno puede esperar mucho.
 */
const RETRY_DELAYS_MS = [1_000, 3_000];

/**
 * Envía un correo ya construido. **Nunca lanza**: un aviso que falla no
 * puede deshacer un pago confirmado ni una cancelación. Un fallo pasajero
 * se reintenta con la misma clave de idempotencia (Resend no duplica); si
 * persiste, queda en consola y en Sentry, sin el cuerpo del correo (lleva
 * datos personales).
 *
 * @param kind — tipo de aviso, para logs y la clave de idempotencia.
 * @param refId — reserva o negocio al que se refiere.
 * @param recipient — destinatario.
 * @param content — contenido ya traducido.
 */
export async function deliverEmail(
  kind: string,
  refId: string,
  recipient: EmailRecipient,
  content: EmailContent,
): Promise<void> {
  if (isTestAddress(recipient.email)) return;
  const message = {
    to: [recipient.email],
    subject: content.subject,
    html: renderEmailHtml(content, recipient.locale),
    text: renderEmailText(content),
    // Stripe reentrega webhooks: la clave evita el correo duplicado
    // durante las 24 h en que Resend la recuerda.
    idempotencyKey: `${kind}/${refId}`,
  };
  for (let attempt = 0; ; attempt++) {
    try {
      await sendEmail(message);
      return;
    } catch (err) {
      const delay = RETRY_DELAYS_MS[attempt];
      if (err instanceof EmailSendError && err.retryable && delay !== undefined) {
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }
      reportNotificationFailure(kind, refId, err);
      return;
    }
  }
}

/** Registra un aviso fallido sin propagar el error al flujo de negocio. */
export function reportNotificationFailure(kind: string, refId: string, err: unknown): void {
  if (err instanceof EmailConfigError) {
    // Previews y local sin clave: no es una incidencia.
    console.warn(`[notifications] ${kind} skipped for ${refId}: RESEND_API_KEY not set`);
    return;
  }
  const reason = err instanceof Error ? err.message : 'unknown';
  console.error(`[notifications] ${kind} failed for ${refId}: ${reason}`);
  if (!isSentryEnabled()) return;
  void import('@sentry/nextjs')
    .then((Sentry) => {
      Sentry.captureMessage(`Email ${kind} failed: ${reason}`, {
        level: 'warning',
        tags: { domain: 'notifications', kind, refId },
      });
    })
    .catch(() => {
      // Sin Sentry solo queda el log de consola.
    });
}
