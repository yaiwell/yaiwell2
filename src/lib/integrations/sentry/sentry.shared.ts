/**
 * Configuración compartida entre los tres runtimes de Sentry
 * (server / edge / client).
 *
 * Mantenemos aquí las decisiones que NO dependen del runtime para que
 * un cambio (sample rate, filtros de PII, lista de ignored errors) se
 * propague a los tres sin desincronizarse.
 */

/**
 * Sample rate para traces de performance.
 *
 * - Desarrollo: 1.0 — queremos ver todo mientras instrumentamos.
 * - Producción: 0.1 — el plan free (10k performance units / mes) se
 *   queda corto con 1.0 en cuanto haya algo de tráfico real.
 */
export const SENTRY_TRACES_SAMPLE_RATE = process.env.NODE_ENV === 'production' ? 0.1 : 1.0;

/**
 * Errores que NO deben llegar a Sentry porque son **control flow** del
 * propio Next/React, no fallos reales:
 *
 *  - `NEXT_REDIRECT`: lo lanza `redirect()` para cortar el render y
 *    cambiar de URL. Es como un `return`, no un error.
 *  - `NEXT_NOT_FOUND`: lo lanza `notFound()` para renderizar la 404.
 *  - `NEXT_HTTP_ERROR_FALLBACK`: lo lanza `forbidden()`/`unauthorized()`
 *    en App Router.
 *  - `BAILOUT_TO_CLIENT_SIDE_RENDERING`: bailout interno de RSC, no
 *    es un error de la app.
 *
 * Si dejamos que estos lleguen a Sentry, llenamos la cuota free
 * con ruido en horas.
 */
export const SENTRY_IGNORED_ERRORS: ReadonlyArray<string | RegExp> = [
  'NEXT_REDIRECT',
  'NEXT_NOT_FOUND',
  'NEXT_HTTP_ERROR_FALLBACK',
  'BAILOUT_TO_CLIENT_SIDE_RENDERING',
];

/**
 * Lista de claves cuyo valor sanitizamos antes de enviar a Sentry.
 *
 * El SDK ya scrubea automáticamente cosas evidentes (Authorization
 * headers, cookies completas) pero añadimos las nuestras: el JWT de
 * Clerk va como `__session`, los webhooks de Stripe traen `stripe-
 * signature` y los emails de los clientes pueden aparecer en el form
 * de sign-up.
 */
export const SENTRY_PII_KEYS: ReadonlyArray<string> = [
  '__session',
  '__clerk_db_jwt',
  'stripe-signature',
  'svix-signature',
  'svix-id',
  'svix-timestamp',
  'email',
  'emailAddress',
  'phone_number',
];

/**
 * Indica si Sentry está activado en el runtime actual.
 *
 * No queremos arrancar el SDK sin DSN — gasta ciclos y ensucia los
 * logs locales. Si la env no está presente, todas las llamadas a
 * `Sentry.captureException` quedarán como no-op gracias a esta guard
 * en los `init()`.
 */
export function isSentryEnabled(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SENTRY_DSN);
}
