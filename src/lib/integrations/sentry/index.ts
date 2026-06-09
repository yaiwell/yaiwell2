/**
 * API pública de la integración Sentry.
 *
 * Los archivos de instrumentation (root del proyecto + src/) importan
 * desde aquí para mantener la fachada estable. Si mañana cambiamos a
 * Datadog o Highlight, solo este barrel apunta a otro sitio.
 */

export {
  SENTRY_TRACES_SAMPLE_RATE,
  SENTRY_IGNORED_ERRORS,
  SENTRY_PII_KEYS,
  isSentryEnabled,
} from './sentry.shared';

export { scrubSentryEvent } from './sentry.scrub';
