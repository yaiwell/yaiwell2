import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { hasLocale } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { Link } from '@/i18n/navigation';
import { routing } from '@/i18n/routing';
import { requireRole } from '@/lib/auth/server';

interface OnboardingPageProps {
  // En Next.js 16 los `params` son asíncronos.
  params: Promise<{ locale: string }>;
}

/**
 * Stub temporal del wizard de onboarding del proveedor (#57 Capa 2).
 *
 * La Capa 1 (#57) ya tiene el backend listo (servicio, repositorio y
 * endpoints), pero la UI de los 5 pasos sigue pendiente. Esta página
 * existe para que `requireCurrentProvider` (panel/layout.tsx) tenga
 * destino real al redirigir a proveedores sin Provider asociado, en
 * lugar de un 404 que rompe la navegación.
 *
 * Vive **fuera** de `/panel/` deliberadamente: el layout de `/panel/`
 * llama a `requireCurrentProvider` y, si redirigiéramos a `/panel/...`,
 * entraríamos en un bucle infinito.
 */
export async function generateMetadata({ params }: OnboardingPageProps): Promise<Metadata> {
  const { locale } = await params;
  const safeLocale = hasLocale(routing.locales, locale) ? locale : routing.defaultLocale;
  const t = await getTranslations({ locale: safeLocale, namespace: 'onboarding.meta' });
  return {
    title: t('title'),
    description: t('description'),
    robots: { index: false, follow: false },
  };
}

export default async function OnboardingPage({ params }: OnboardingPageProps) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }
  setRequestLocale(locale);

  // Solo proveedores autenticados acceden al wizard. Clientes/admins son
  // redirigidos por `requireRole` a su destino natural.
  await requireRole(['provider'], locale);

  const t = await getTranslations('onboarding');

  return (
    <section className="mx-auto flex w-full max-w-xl flex-col gap-6 px-4 py-16 sm:py-24">
      <header className="flex flex-col gap-3">
        <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-stone-100 px-3 py-1 text-xs font-medium text-stone-700 dark:bg-stone-800/60 dark:text-stone-300">
          {t('badge')}
        </span>
        <h1 className="font-serif text-3xl tracking-tight text-stone-900 sm:text-4xl dark:text-stone-50">
          {t('title')}
        </h1>
        <p className="text-base text-stone-600 dark:text-stone-400">{t('subtitle')}</p>
      </header>
      <p className="rounded-2xl border border-dashed border-stone-300 bg-stone-50 p-4 text-sm text-stone-700 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-300">
        {t('comingSoon')}
      </p>
      <Link
        href="/"
        className="inline-flex w-fit items-center justify-center rounded-full border border-stone-300 bg-white px-5 py-2 text-sm font-medium text-stone-900 transition-colors hover:bg-stone-50 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100 dark:hover:bg-stone-800"
      >
        {t('backHome')}
      </Link>
    </section>
  );
}
