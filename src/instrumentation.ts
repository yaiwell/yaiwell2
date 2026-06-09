import type { Instrumentation } from 'next';

import {
  isSentryEnabled,
  scrubSentryEvent,
  SENTRY_TRACES_SAMPLE_RATE,
} from '@/lib/integrations/sentry';

/**
 * Punto de entrada de instrumentación de Next.js (server + edge).
 *
 * Se ejecuta UNA VEZ cuando arranca cada instancia del servidor antes
 * de servir requests. Aquí inicializamos Sentry para Node y Edge
 * runtimes según `process.env.NEXT_RUNTIME`.
 *
 * Si no hay DSN, no arrancamos nada — todas las llamadas a
 * `Sentry.captureException` quedan como no-op y no gastamos ciclos en
 * dev / preview builds sin secretos.
 */
export async function register() {
  if (!isSentryEnabled()) return;

  const Sentry = await import('@sentry/nextjs');

  if (process.env.NEXT_RUNTIME === 'nodejs') {
    Sentry.init({
      dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
      // Tag de entorno: Sentry agrupa issues y separa cuotas por env.
      environment: process.env.SENTRY_ENVIRONMENT ?? process.env.NODE_ENV,
      // Versión del deploy (Vercel lo expone como `VERCEL_GIT_COMMIT_SHA`).
      // Permite filtrar "este bug solo aparece desde el deploy X" en el UI.
      release: process.env.NEXT_PUBLIC_SENTRY_RELEASE,
      tracesSampleRate: SENTRY_TRACES_SAMPLE_RATE,
      // `sendDefaultPii: false` impide que el SDK envíe IPs, headers
      // completos o cookies sin scrubbing. Capa de defensa por encima
      // del `beforeSend` propio.
      sendDefaultPii: false,
      beforeSend: scrubSentryEvent,
      // Spotlight es la herramienta de Sentry para ver eventos en local;
      // útil cuando trabajemos con el DSN real, ruidoso por defecto.
      spotlight: process.env.NODE_ENV === 'development',
    });
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    Sentry.init({
      dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
      environment: process.env.SENTRY_ENVIRONMENT ?? process.env.NODE_ENV,
      release: process.env.NEXT_PUBLIC_SENTRY_RELEASE,
      tracesSampleRate: SENTRY_TRACES_SAMPLE_RATE,
      sendDefaultPii: false,
      beforeSend: scrubSentryEvent,
    });
  }
}

/**
 * `onRequestError` reporta a Sentry los errores que Next captura
 * durante el render server-side. El SDK expone un helper específico
 * (`captureRequestError`) que añade el contexto correcto (router type,
 * route path, render source) automáticamente.
 */
export const onRequestError: Instrumentation.onRequestError = async (err, request, context) => {
  if (!isSentryEnabled()) return;
  const Sentry = await import('@sentry/nextjs');
  Sentry.captureRequestError(err, request, context);
};
