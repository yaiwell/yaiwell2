import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { hasLocale } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { ForProvidersLanding } from '@/components/features/marketing';
import { routing } from '@/i18n/routing';

interface ForProvidersPageProps {
  // En Next.js 16 `params` es una promesa.
  params: Promise<{ locale: string }>;
}

/**
 * Genera los metadatos SEO de la landing /profesionales.
 *
 * Hereda el template `%s | Yeiwell` definido en el layout raíz, así que
 * sólo aportamos el título específico ("Para profesionales") y una
 * description orientada a SEO comercial (palabras clave: marketplace,
 * gratis, sin permanencia).
 */
export async function generateMetadata({
  params,
}: ForProvidersPageProps): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) return {};

  const t = await getTranslations({ locale, namespace: 'forProviders.meta' });

  return {
    title: t('title'),
    description: t('description'),
    openGraph: {
      title: t('title'),
      description: t('description'),
    },
    twitter: {
      title: t('title'),
      description: t('description'),
    },
  };
}

/**
 * Landing comercial /profesionales.
 *
 * Server Component que:
 *  - Valida el locale y activa `setRequestLocale` para mantener el
 *    renderizado estático por idioma definido en el layout.
 *  - Renderiza el orquestador `ForProvidersLanding`, que compone las
 *    cinco secciones (hero, beneficios, planes, FAQ y CTA final).
 */
export default async function ForProvidersPage({ params }: ForProvidersPageProps) {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }
  setRequestLocale(locale);

  return (
    <div data-component="for-providers-page" className="contents">
      <ForProvidersLanding />
    </div>
  );
}
