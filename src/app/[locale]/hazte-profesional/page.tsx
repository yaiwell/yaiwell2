import { auth, currentUser } from '@clerk/nextjs/server';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { hasLocale } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { BecomeProviderConfirm } from '@/components/features/onboarding/BecomeProviderConfirm';
import { redirect } from '@/i18n/navigation';
import { routing } from '@/i18n/routing';
import {
  buildBecomeProviderHref,
  getRoleFromUser,
  resolveBecomeProviderPageRedirect,
} from '@/lib/auth';
import { parseBecomeProviderPlan, withRedirectUrl } from '@/lib/validation';

import { becomeProviderAction } from './actions';

interface BecomeProviderPageProps {
  // En Next.js 16 `params` y `searchParams` son asíncronos.
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

/** Pantalla privada de paso: nunca se indexa. */
export async function generateMetadata({ params }: BecomeProviderPageProps): Promise<Metadata> {
  const { locale } = await params;
  const safeLocale = hasLocale(routing.locales, locale) ? locale : routing.defaultLocale;
  const t = await getTranslations({ locale: safeLocale, namespace: 'becomeProvider.meta' });
  return {
    title: t('title'),
    description: t('description'),
    robots: { index: false, follow: false },
  };
}

/**
 * Página `/hazte-profesional`: un cliente con sesión confirma que quiere
 * convertir su cuenta en profesional para crear su negocio.
 *
 * Llegan aquí quien pulsa un CTA de `/profesionales` ya con sesión de
 * cliente (vía `/registro?as=provider`), quien entra en `/onboarding`
 * siendo cliente y quien vuelve de Google desde el alta de profesional
 * con una cuenta de cliente que ya existía.
 *
 * El rol se lee de `currentUser()` y no de los claims: justo después de
 * convertir la cuenta el JWT puede seguir diciendo `client`.
 */
export default async function BecomeProviderPage({
  params,
  searchParams,
}: BecomeProviderPageProps) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }
  setRequestLocale(locale);

  const plan = parseBecomeProviderPlan((await searchParams).plan);

  const { userId } = await auth();
  if (!userId) {
    // Tras entrar, `/entrar` devuelve al cliente aquí con su plan.
    redirect({ href: withRedirectUrl('/entrar', buildBecomeProviderHref(plan)), locale });
  }

  const target = resolveBecomeProviderPageRedirect(getRoleFromUser(await currentUser()));
  if (target) {
    redirect({ href: target, locale });
  }

  return <BecomeProviderConfirm plan={plan} action={becomeProviderAction} />;
}
