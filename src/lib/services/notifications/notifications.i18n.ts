import { createTranslator } from 'next-intl';

import type { AppLocale } from '@/i18n/routing';
import ca from '@/messages/emails/ca.json';
import de from '@/messages/emails/de.json';
import en from '@/messages/emails/en.json';
import es from '@/messages/emails/es.json';

/**
 * Los textos de correo viven en `messages/emails/*.json`, fuera de los
 * mensajes de la web: así no viajan al navegador con cada página y los
 * podemos usar fuera de una petición (webhooks, `after()`).
 */
const EMAIL_MESSAGES = { es, ca, en, de } as const satisfies Record<AppLocale, typeof es>;

/**
 * Traductor de correos para un idioma.
 *
 * @param locale — idioma del destinatario (`users.locale`).
 */
export function getEmailTranslator(locale: AppLocale) {
  return createTranslator({
    locale,
    // eslint-disable-next-line no-restricted-syntax -- diccionario con los 4 idiomas garantizados por `satisfies` y por el test de paridad.
    messages: { emails: EMAIL_MESSAGES[locale] },
    namespace: 'emails',
  });
}

export type EmailTranslator = ReturnType<typeof getEmailTranslator>;
