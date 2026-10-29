import 'server-only';

import type { AppLocale } from '@/i18n/routing';
import ca from '@/messages/legal/ca.json';
import de from '@/messages/legal/de.json';
import en from '@/messages/legal/en.json';
import es from '@/messages/legal/es.json';

import type { LegalDocumentContent } from './legal.types';

/**
 * Buzón para ejercer los derechos de protección de datos. Es el mismo
 * contacto público del footer, así el usuario ve un único canal.
 */
export const PRIVACY_CONTACT_EMAIL = 'hola@yaiwell.com';

/** Fecha de la versión vigente. Actualizarla con cada cambio del texto. */
export const PRIVACY_UPDATED_AT = new Date('2026-10-29T12:00:00.000Z');

/**
 * Textos legales por idioma. Van aparte de `messages/{locale}.json` porque
 * esos viajan enteros al navegador en cada página; la política solo se
 * pinta en su propia página, en servidor.
 */
const LEGAL_MESSAGES = new Map<AppLocale, typeof es>([
  ['es', es],
  ['ca', ca],
  ['en', en],
  ['de', de],
]);

/** Sección tal como está en el JSON: párrafos e ítems son opcionales. */
interface RawSection {
  heading: string;
  paragraphs?: string[];
  items?: string[];
}

/**
 * Devuelve la política de privacidad en el idioma pedido, con el email de
 * contacto y la fecha ya sustituidos.
 *
 * @param locale — idioma de la página.
 */
export function getPrivacyDocument(locale: AppLocale): LegalDocumentContent {
  const privacy = (LEGAL_MESSAGES.get(locale) ?? es).privacy;
  const date = new Intl.DateTimeFormat(locale, {
    dateStyle: 'long',
    timeZone: 'Europe/Madrid',
  }).format(PRIVACY_UPDATED_AT);
  const fill = (text: string) => text.replaceAll('{email}', PRIVACY_CONTACT_EMAIL);

  return {
    title: privacy.title,
    description: privacy.meta.description,
    metaTitle: privacy.meta.title,
    updated: privacy.updated.replace('{date}', date),
    intro: privacy.intro,
    sections: (privacy.sections as RawSection[]).map((section) => ({
      heading: section.heading,
      paragraphs: (section.paragraphs ?? []).map(fill),
      items: (section.items ?? []).map(fill),
    })),
  };
}
