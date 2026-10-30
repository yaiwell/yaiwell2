import 'server-only';

import type { AppLocale } from '@/i18n/routing';
import ca from '@/messages/legal/ca.json';
import de from '@/messages/legal/de.json';
import en from '@/messages/legal/en.json';
import es from '@/messages/legal/es.json';

import type { LegalDocumentContent, LegalDocumentKind } from './legal.types';

/**
 * Buzón de contacto de los documentos legales (derechos de datos,
 * cancelaciones, quejas). Es el mismo contacto público del footer, así el
 * usuario ve un único canal.
 */
export const LEGAL_CONTACT_EMAIL = 'hola@yaiwell.com';

/**
 * Fecha de la versión vigente de cada documento. Actualizarla con cada
 * cambio del texto correspondiente.
 */
const UPDATED_AT: Record<LegalDocumentKind, Date> = {
  privacy: new Date('2026-10-29T12:00:00.000Z'),
  terms: new Date('2026-10-30T12:00:00.000Z'),
  cookies: new Date('2026-10-29T12:00:00.000Z'),
};

/**
 * Textos legales por idioma. Van aparte de `messages/{locale}.json` porque
 * esos viajan enteros al navegador en cada página; los documentos legales
 * solo se pintan en su propia página, en servidor.
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
 * Devuelve un documento legal en el idioma pedido, con el email de
 * contacto y la fecha ya sustituidos.
 *
 * @param kind — documento: privacidad, términos o cookies.
 * @param locale — idioma de la página.
 */
export function getLegalDocument(kind: LegalDocumentKind, locale: AppLocale): LegalDocumentContent {
  const doc = (LEGAL_MESSAGES.get(locale) ?? es)[kind];
  const date = new Intl.DateTimeFormat(locale, {
    dateStyle: 'long',
    timeZone: 'Europe/Madrid',
  }).format(UPDATED_AT[kind]);
  const fill = (text: string) => text.replaceAll('{email}', LEGAL_CONTACT_EMAIL);

  return {
    title: doc.title,
    description: doc.meta.description,
    metaTitle: doc.meta.title,
    updated: doc.updated.replace('{date}', date),
    intro: fill(doc.intro),
    sections: (doc.sections as RawSection[]).map((section) => ({
      heading: section.heading,
      paragraphs: (section.paragraphs ?? []).map(fill),
      items: (section.items ?? []).map(fill),
    })),
  };
}
