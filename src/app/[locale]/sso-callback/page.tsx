import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { hasLocale } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { SsoCallback } from '@/components/features/auth';
import { getPathname } from '@/i18n/navigation';
import { routing } from '@/i18n/routing';
import { REDIRECT_URL_PARAM, parseInternalRedirectUrl } from '@/lib/validation/redirect-url';

interface SsoCallbackPageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

/** Pantalla técnica de paso: nunca se indexa. */
export async function generateMetadata({ params }: SsoCallbackPageProps): Promise<Metadata> {
  const { locale } = await params;
  const safeLocale = hasLocale(routing.locales, locale) ? locale : routing.defaultLocale;
  const t = await getTranslations({ locale: safeLocale, namespace: 'googleAuth.callback' });
  return { title: t('title'), robots: { index: false, follow: false } };
}

/**
 * Página `/sso-callback`: vuelta del OAuth de Google.
 *
 * Reenvía el `redirect_url` (saneado con Zod: sin eso sería un redirect
 * abierto) al destino final, `/entrar`, cuyo guard manda a cada usuario
 * a su área según el rol.
 */
export default async function SsoCallbackPage({ params, searchParams }: SsoCallbackPageProps) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }
  setRequestLocale(locale);

  const redirectUrl = parseInternalRedirectUrl((await searchParams)[REDIRECT_URL_PARAM]);
  const query = redirectUrl ? { [REDIRECT_URL_PARAM]: redirectUrl } : undefined;

  return (
    <SsoCallback
      completeUrl={getPathname({ href: { pathname: '/entrar', query }, locale })}
      signInUrl={getPathname({ href: { pathname: '/entrar', query }, locale })}
      signUpUrl={getPathname({ href: { pathname: '/registro', query }, locale })}
    />
  );
}
