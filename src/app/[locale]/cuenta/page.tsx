import { auth } from '@clerk/nextjs/server';
import {
  Bookmark,
  CalendarCheck,
  ChevronRight,
  LogIn,
  Settings,
  Sparkles,
  UserPlus,
} from 'lucide-react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { hasLocale } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { Link } from '@/i18n/navigation';
import { routing } from '@/i18n/routing';

interface AccountPageProps {
  // En Next.js 16 los `params` son asíncronos.
  params: Promise<{ locale: string }>;
}

/**
 * Metadatos de la pantalla `/cuenta`.
 *
 * Es una página utilitaria (pasarela de auth + accesos del usuario),
 * así que pedimos a Google que no la indexe. Aún así fijamos un title
 * descriptivo por si alguien comparte el enlace.
 */
export async function generateMetadata({ params }: AccountPageProps): Promise<Metadata> {
  const { locale } = await params;
  const safeLocale = hasLocale(routing.locales, locale) ? locale : routing.defaultLocale;
  const t = await getTranslations({ locale: safeLocale, namespace: 'account.meta' });

  return {
    title: t('title'),
    description: t('description'),
    robots: { index: false, follow: true },
  };
}

/**
 * Estilos del shell de la página `/cuenta`.
 *
 * Mantenemos los Tailwind agrupados aquí porque el componente es lo
 * bastante pequeño para no merecer su propio `.styles.ts` aparte (vid.
 * §6.bis de CLAUDE.md: "componentes triviales pueden quedarse en un
 * único archivo").
 */
const accountStyles = {
  shell: 'mx-auto flex w-full max-w-md flex-1 flex-col gap-8 px-4 py-10 sm:max-w-2xl sm:py-16',
  hero: 'flex flex-col gap-3',
  heroBadge:
    'inline-flex w-fit items-center gap-1.5 rounded-full bg-stone-100 px-3 py-1 text-xs font-medium text-stone-700 dark:bg-stone-800/60 dark:text-stone-300',
  heroTitle: 'font-serif text-3xl tracking-tight text-stone-900 sm:text-4xl dark:text-stone-50',
  heroSubtitle: 'text-base text-stone-600 dark:text-stone-400',

  ctaStack: 'flex flex-col gap-3',
  primaryCta:
    'inline-flex items-center justify-center gap-2 rounded-full bg-stone-900 px-6 py-3 text-sm font-medium text-stone-50 transition-colors hover:bg-stone-800 dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-stone-200',
  secondaryCta:
    'inline-flex items-center justify-center gap-2 rounded-full border border-stone-300 bg-white px-6 py-3 text-sm font-medium text-stone-900 transition-colors hover:bg-stone-50 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100 dark:hover:bg-stone-800',

  linkList:
    'flex flex-col divide-y divide-stone-200 overflow-hidden rounded-2xl border border-stone-200 bg-white dark:divide-stone-800 dark:border-stone-800 dark:bg-stone-900',
  linkItem:
    'flex items-center justify-between gap-3 px-4 py-3 text-sm text-stone-800 transition-colors hover:bg-stone-50 dark:text-stone-200 dark:hover:bg-stone-800/60',
  linkLeft: 'flex items-center gap-3',
  linkIcon: 'size-4 text-stone-500 dark:text-stone-400',
  linkChevron: 'size-4 text-stone-400 dark:text-stone-500',

  sectionTitle: 'text-xs font-medium uppercase tracking-wider text-stone-500 dark:text-stone-400',
} as const;

/**
 * Página `/cuenta` — pasarela del usuario.
 *
 * Estrategia "Smart tab" (Opción A acordada con el cliente):
 *
 *  - **No autenticado:** muestra dos CTAs grandes (Entrar / Crear cuenta)
 *    y un grupo de utilidades públicas (idioma, tema, ayuda) accesibles
 *    sin sesión. Es la primera parada de un usuario que pulsa la pestaña
 *    "Cuenta" del MobileNav sin haber iniciado sesión.
 *
 *  - **Autenticado:** muestra accesos al área cliente (reservas,
 *    favoritos, ajustes) y un botón de cerrar sesión.
 *
 *  Detectamos la sesión con `auth()` server-side (`@clerk/nextjs/server`).
 *  Mientras el sign-in real con Clerk no esté cableado, `userId` será
 *  siempre `null` y veremos la rama "no autenticado", que es el
 *  comportamiento esperado en Fase 0.
 */
export default async function AccountPage({ params }: AccountPageProps) {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  setRequestLocale(locale);

  const { userId } = await auth();
  const isAuthenticated = userId !== null;
  const t = await getTranslations('account');

  return (
    <section className={accountStyles.shell} data-component="account-page">
      <header className={accountStyles.hero}>
        <span className={accountStyles.heroBadge}>
          <Sparkles className="size-3.5" aria-hidden="true" />
          {isAuthenticated ? t('hero.badgeAuthenticated') : t('hero.badgeGuest')}
        </span>
        <h1 className={accountStyles.heroTitle}>
          {isAuthenticated ? t('hero.titleAuthenticated') : t('hero.titleGuest')}
        </h1>
        <p className={accountStyles.heroSubtitle}>
          {isAuthenticated ? t('hero.subtitleAuthenticated') : t('hero.subtitleGuest')}
        </p>
      </header>

      {isAuthenticated ? (
        <nav
          className={accountStyles.linkList}
          aria-label={t('authenticated.navLabel')}
          data-component="account-authenticated-links"
        >
          <Link href="/mis-reservas" className={accountStyles.linkItem}>
            <span className={accountStyles.linkLeft}>
              <CalendarCheck className={accountStyles.linkIcon} aria-hidden="true" />
              {t('authenticated.bookings')}
            </span>
            <ChevronRight className={accountStyles.linkChevron} aria-hidden="true" />
          </Link>
          <Link href="/mis-reservas" className={accountStyles.linkItem}>
            <span className={accountStyles.linkLeft}>
              <Bookmark className={accountStyles.linkIcon} aria-hidden="true" />
              {t('authenticated.favorites')}
            </span>
            <ChevronRight className={accountStyles.linkChevron} aria-hidden="true" />
          </Link>
          <Link href="/mis-reservas" className={accountStyles.linkItem}>
            <span className={accountStyles.linkLeft}>
              <Settings className={accountStyles.linkIcon} aria-hidden="true" />
              {t('authenticated.settings')}
            </span>
            <ChevronRight className={accountStyles.linkChevron} aria-hidden="true" />
          </Link>
        </nav>
      ) : (
        <div className={accountStyles.ctaStack} data-component="account-guest-cta">
          <Link
            href="/entrar"
            className={accountStyles.primaryCta}
            data-component="account-cta-sign-in"
          >
            <LogIn className="size-4" aria-hidden="true" />
            {t('guest.signInCta')}
          </Link>
          <Link
            href="/registro"
            className={accountStyles.secondaryCta}
            data-component="account-cta-sign-up"
          >
            <UserPlus className="size-4" aria-hidden="true" />
            {t('guest.signUpCta')}
          </Link>
        </div>
      )}
    </section>
  );
}
