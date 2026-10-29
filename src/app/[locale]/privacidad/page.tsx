import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { hasLocale } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';

import { LegalDocument } from '@/components/features/legal';
import { routing } from '@/i18n/routing';
import { getLegalDocument, legalPageMetadata } from '@/lib/legal';

interface PrivacyPageProps {
  // En Next.js 16 `params` es una promesa.
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: PrivacyPageProps): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) return {};
  return legalPageMetadata('privacy', locale, '/privacidad');
}

/**
 * Política de privacidad. El texto vive en `messages/legal/{locale}.json` (clave
 * `privacy`) y se pinta en servidor.
 */
export default async function PrivacyPage({ params }: PrivacyPageProps) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  return <LegalDocument document={getLegalDocument('privacy', locale)} />;
}
