import { notFound } from 'next/navigation';
import { hasLocale } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import type { Metadata } from 'next';

import { routing } from '@/i18n/routing';
import { SignInForm } from '@/components/features/auth';

interface SignInPageProps {
  // En Next.js 16 los `params` de los segmentos dinámicos son asíncronos.
  params: Promise<{ locale: string }>;
}

/**
 * Genera el `<title>` y la meta description de la pantalla de sign-in.
 *
 * Es una pantalla utilitaria, así que indexar tiene poco valor SEO. Aún
 * así dejamos `robots.index = false` explícito y un título descriptivo
 * para mejorar la experiencia al compartir el enlace.
 */
export async function generateMetadata({ params }: SignInPageProps): Promise<Metadata> {
  const { locale } = await params;
  const safeLocale = hasLocale(routing.locales, locale) ? locale : routing.defaultLocale;
  const t = await getTranslations({ locale: safeLocale, namespace: 'signIn' });

  return {
    title: t('meta.title'),
    description: t('meta.description'),
    robots: { index: false, follow: true },
  };
}

/**
 * Pantalla `/entrar` (sign-in mock).
 *
 * Server Component que sólo valida el locale, fija el contexto i18n y
 * renderiza el formulario interactivo (Client Component). Toda la lógica
 * de UI vive en `SignInForm`.
 */
export default async function SignInPage({ params }: SignInPageProps) {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  setRequestLocale(locale);

  return <SignInForm />;
}
