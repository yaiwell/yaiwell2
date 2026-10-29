import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { hasLocale } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';

import { LegalDocument } from '@/components/features/legal';
import { routing } from '@/i18n/routing';
import { getPrivacyDocument } from '@/lib/legal';
import { buildAlternates } from '@/lib/seo';

interface PrivacyPageProps {
  // En Next.js 16 `params` es una promesa.
  params: Promise<{ locale: string }>;
}

/** Metadatos SEO de /privacidad, con canónica y `hreflang` por idioma. */
export async function generateMetadata({ params }: PrivacyPageProps): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) return {};

  const document = getPrivacyDocument(locale);
  const alternates = buildAlternates(locale, '/privacidad');
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

/**
 * Política de privacidad. Página estática: el texto vive en
 * `messages/legal/{locale}.json` y se pinta en servidor.
 */
export default async function PrivacyPage({ params }: PrivacyPageProps) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  return <LegalDocument document={getPrivacyDocument(locale)} />;
}
