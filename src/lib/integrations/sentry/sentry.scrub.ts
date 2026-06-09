import type { ErrorEvent, EventHint } from '@sentry/nextjs';

import { SENTRY_IGNORED_ERRORS, SENTRY_PII_KEYS } from './sentry.shared';

/**
 * Hook `beforeSend` que aplicamos en los tres runtimes (server / edge /
 * client). Hace tres cosas:
 *
 *  1. **Descarta** errores cuyo `name`/`message` matchea
 *     `SENTRY_IGNORED_ERRORS` (control flow de Next/React).
 *  2. **Sanitiza** PII en headers, cookies y request data — el SDK
 *     scrubea cosas evidentes pero los nuestros (`__session` de Clerk,
 *     `stripe-signature`) hay que añadirlos a mano.
 *  3. Devuelve `null` cuando hay que descartar, el evento sanitizado
 *     cuando hay que enviarlo.
 *
 * No tocamos `event.user.id` — el `clerkId` es opaco y útil para
 * agrupar issues por usuario; tampoco `event.user.ip_address` (Sentry
 * ya respeta `sendDefaultPii: false`).
 */
export function scrubSentryEvent(event: ErrorEvent, hint: EventHint): ErrorEvent | null {
  // Descarte por error conocido (control flow de Next).
  const original = hint.originalException;
  if (original instanceof Error) {
    const id = original.message ?? original.name;
    for (const pattern of SENTRY_IGNORED_ERRORS) {
      if (typeof pattern === 'string' ? id.includes(pattern) : pattern.test(id)) {
        return null;
      }
    }
  }

  // Sanitizar headers + cookies de la request si vienen.
  if (event.request) {
    if (event.request.headers) {
      event.request.headers = scrubObject(event.request.headers);
    }
    if (event.request.cookies) {
      event.request.cookies = scrubObject(event.request.cookies);
    }
    if (event.request.data && typeof event.request.data === 'object') {
      event.request.data = scrubObject(event.request.data as Record<string, unknown>);
    }
  }

  // Sanitizar extra/context que pueda haber añadido el caller con
  // `Sentry.setContext`.
  if (event.extra) {
    event.extra = scrubObject(event.extra);
  }

  return event;
}

/**
 * Reemplaza por `[Filtered]` los valores de las claves listadas en
 * `SENTRY_PII_KEYS`. Case-insensitive (Sentry normaliza headers en
 * minúsculas, pero el resto puede llegar mixed-case).
 */
function scrubObject<T extends Record<string, unknown>>(obj: T): T {
  const piiSet = new Set(SENTRY_PII_KEYS.map((k) => k.toLowerCase()));
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (piiSet.has(key.toLowerCase())) {
      result[key] = '[Filtered]';
    } else {
      result[key] = value;
    }
  }
  return result as T;
}
