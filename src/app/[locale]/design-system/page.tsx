import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { hasLocale } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { DesignSystemPage } from '@/components/features/design-system';
import { routing } from '@/i18n/routing';

interface DesignSystemRouteProps {
  // En Next.js 16 los `params` de los segmentos dinámicos son asíncronos.
  params: Promise<{ locale: string }>;
}

/**
 * Página `/design-system` — galería interna de tokens de marca.
 *
 * No es una página de producto: se usa para QA visual durante el rediseño
 * (revisar swatches, contraste de botones, variantes de radius). Marcamos
 * `robots.index = false` porque no debe aparecer en búsquedas y no
 * añadimos enlaces desde la nav. Solo se llega por URL directa.
 */
export async function generateMetadata({
  params,
}: DesignSystemRouteProps): Promise<Metadata> {
  const { locale } = await params;
  const safeLocale = hasLocale(routing.locales, locale) ? locale : routing.defaultLocale;
  const t = await getTranslations({ locale: safeLocale, namespace: 'designSystem' });

  return {
    title: t('meta.title'),
    description: t('meta.description'),
    robots: { index: false, follow: false },
  };
}

export default async function DesignSystemRoute({ params }: DesignSystemRouteProps) {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }
  setRequestLocale(locale);

  return <DesignSystemPage />;
}
