import { auth } from '@clerk/nextjs/server';
import { ArrowLeft } from 'lucide-react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { hasLocale } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { AccountDataCard } from '@/components/features/account/AccountDataCard';
import {
  AccountPreferencesCard,
  AccountProfileCard,
} from '@/components/features/account/AccountSettings';
import { Link, redirect } from '@/i18n/navigation';
import { routing, type AppLocale } from '@/i18n/routing';
import { ensureUserFromClerk } from '@/lib/services/user';

interface SettingsPageProps {
  params: Promise<{ locale: string }>;
}

/** Página privada: no se indexa. */
export async function generateMetadata({ params }: SettingsPageProps): Promise<Metadata> {
  const { locale } = await params;
  const safeLocale = hasLocale(routing.locales, locale) ? locale : routing.defaultLocale;
  const t = await getTranslations({ locale: safeLocale, namespace: 'account.settings' });
  return { title: t('title'), description: t('subtitle'), robots: { index: false, follow: false } };
}

/**
 * `/cuenta/ajustes`: perfil, preferencias y datos de la cuenta. Es de clientes
 * y de profesionales; el negocio se gestiona en el panel.
 */
export default async function AccountSettingsPage({ params }: SettingsPageProps) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  const { userId } = await auth();
  if (!userId) {
    redirect({ href: '/entrar', locale });
    return null;
  }

  const [t, user] = await Promise.all([
    getTranslations('account.settings'),
    ensureUserFromClerk(userId),
  ]);

  return (
    <section
      className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-4 py-10 sm:max-w-2xl sm:py-16"
      data-component="account-settings-page"
    >
      <header className="flex flex-col gap-2">
        <Link
          href="/cuenta"
          className="inline-flex min-h-11 w-fit items-center gap-2 text-sm text-stone-600 dark:text-stone-400"
          data-component="account-settings-back"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          {t('back')}
        </Link>
        <h1 className="font-serif text-3xl tracking-tight text-stone-900 sm:text-4xl dark:text-stone-50">
          {t('title')}
        </h1>
        <p className="text-base text-stone-600 dark:text-stone-400">{t('subtitle')}</p>
      </header>

      <AccountProfileCard />
      <AccountPreferencesCard emailLocale={user.locale as AppLocale} />
      <AccountDataCard locale={locale} />
    </section>
  );
}
