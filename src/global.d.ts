import type { routing } from '@/i18n/routing';

import type messages from './messages/es.json';

/**
 * Augmenta el `AppConfig` de next-intl para que `useTranslations`,
 * `getTranslations`, `t(...)` y compañía ofrezcan autocompletado y
 * comprobación de tipos sobre las claves reales del proyecto.
 *
 * Nota: en next-intl 4 la API correcta para tipado global es declarar
 * `AppConfig` en el módulo `next-intl`, no la antigua `IntlMessages` de
 * next-intl 3. Usamos `es.json` como fuente de la verdad porque es el
 * locale por defecto y el más completo; los demás locales deben
 * mantener el mismo árbol de claves.
 */
declare module 'next-intl' {
  interface AppConfig {
    Locale: (typeof routing.locales)[number];
    Messages: typeof messages;
  }
}
