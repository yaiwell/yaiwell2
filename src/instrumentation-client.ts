import * as Sentry from '@sentry/nextjs';

import {
  isSentryEnabled,
  scrubSentryEvent,
  SENTRY_TRACES_SAMPLE_RATE,
} from '@/lib/integrations/sentry';

/**
 * Instrumentación del cliente (browser).
 *
 * Next 16 carga este archivo automáticamente desde `src/` antes de la
 * hidratación de React. Mantenemos el bundle mínimo:
 *  - Replay desactivado (la integración pesa ~50KB; lo activaremos en
 *    Fase 1 solo en sesiones con error si Lighthouse lo permite).
 *  - Profiling desactivado (no aporta nada en Fase 0).
 *  - `tracePropagationTargets` apunta solo a nuestra propia API, no
 *    queremos meter el header `sentry-trace` en requests a terceros.
 */

if (isSentryEnabled()) {
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    environment: process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT ?? process.env.NODE_ENV,
    release: process.env.NEXT_PUBLIC_SENTRY_RELEASE,
    tracesSampleRate: SENTRY_TRACES_SAMPLE_RATE,
    sendDefaultPii: false,
    beforeSend: scrubSentryEvent,
    tracePropagationTargets: [/^https:\/\/(www\.)?yaiwell\.(com|app)\//, /^\//],
    integrations: [
      // Integraciones por defecto del SDK son suficientes para Fase 0.
      // Añadiremos `Sentry.replayIntegration()` en Fase 1 si decidimos
      // monitorear sesiones con error.
    ],
  });
}

/**
 * Hook que Next dispara al iniciar una navegación. Lo cableamos a
 * Sentry para que las traces de cliente puedan medir tiempos de
 * navegación correctamente.
 */
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
