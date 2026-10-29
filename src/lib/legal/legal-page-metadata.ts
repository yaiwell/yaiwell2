import 'server-only';

import type { Metadata } from 'next';

import type { AppLocale } from '@/i18n/routing';
import { buildAlternates } from '@/lib/seo';

import { getLegalDocument } from './legal-document';
import type { LegalDocumentKind } from './legal.types';

/**
 * Metadatos SEO comunes de las páginas legales: título, descripción,
 * canónica y `hreflang`.
 *
 * @param kind — documento.
 * @param locale — idioma de la página.
 * @param path — ruta sin prefijo de idioma (`/privacidad`).
 */
export function legalPageMetadata(
  kind: LegalDocumentKind,
  locale: AppLocale,
  path: string,
): Metadata {
  const document = getLegalDocument(kind, locale);
  const alternates = buildAlternates(locale, path);
  return {
    title: document.metaTitle,
    description: document.description,
    alternates,
    openGraph: {
      title: document.metaTitle,
      description: document.description,
      url: alternates.canonical,
    },
  };
}
