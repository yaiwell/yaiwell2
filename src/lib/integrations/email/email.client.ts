import { Resend } from 'resend';

import { EmailConfigError } from './email.errors';

/**
 * Cliente Resend singleton para uso en server-side.
 *
 * Inicialización perezosa: instanciamos solo la primera vez que alguien
 * pide el cliente. Esto permite que el build no reviente si
 * `RESEND_API_KEY` no está presente (preview builds sin secretos, CI
 * corriendo lint/typecheck, rutas que no envían email).
 *
 * **Nunca importar desde Client Components.** La key vive en server-only.
 */

let cached: Resend | null = null;

export function getEmailClient(): Resend {
  if (cached) return cached;

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new EmailConfigError();
  }

  cached = new Resend(apiKey);
  return cached;
}

/**
 * Helper interno para tests: limpia el singleton para que cada test
 * pueda forzar una re-inicialización con env distinto.
 */
export function __resetEmailClientForTests() {
  cached = null;
}
