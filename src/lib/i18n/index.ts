/**
 * API pública de `lib/i18n`.
 *
 * Deliberadamente sin dependencias de servidor (Prisma, `server-only`):
 * este barrel lo importan Client Components, y arrastrar el driver de
 * Postgres al bundle rompería el build. Los schemas Zod de textos
 * localizados viven en `@/lib/validation` por la misma razón.
 */

export { pickLocalized } from './pickLocalized';
export { toIntlLocale } from './intlLocale';

export {
  buildLocalizedText,
  ensureSpanish,
  ensureSpanishIfAny,
  hasSpanish,
  mergeLocalizedText,
} from './localizedText';
export type { StorableLocalizedText } from './localizedText';

export { EmptyLocalizedTextError } from './localizedText.errors';
