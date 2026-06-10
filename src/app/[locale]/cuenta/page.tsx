import { SignOutButton } from '@clerk/nextjs';
import { auth, currentUser } from '@clerk/nextjs/server';
import {
  Bookmark,
  CalendarCheck,
  ChevronRight,
  LayoutDashboard,
  LogIn,
  LogOut,
  Settings,
  Sparkles,
  UserPlus,
  UserRound,
} from 'lucide-react';
import type { Metadata } from 'next';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { hasLocale } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { Link } from '@/i18n/navigation';
import { routing } from '@/i18n/routing';
import { getRoleFromSessionClaims, getRoleFromUser } from '@/lib/auth/role';
import { getUiMode } from '@/lib/auth/ui-mode';

import { switchUiModeAction } from './ui-mode.actions';

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

  identityCard:
    'flex items-center gap-4 rounded-2xl border border-stone-200 bg-white p-4 dark:border-stone-800 dark:bg-stone-900',
  identityAvatar:
    'inline-flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-stone-200 text-stone-700 dark:bg-stone-800 dark:text-stone-300',
  identityName: 'text-sm font-medium text-stone-900 dark:text-stone-100',
  identityEmail: 'text-xs text-stone-500 dark:text-stone-400',

  ctaStack: 'flex flex-col gap-3',
  primaryCta:
    'inline-flex items-center justify-center gap-2 rounded-full bg-stone-900 px-6 py-3 text-sm font-medium text-stone-50 transition-colors hover:bg-stone-800 dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-stone-200',
  secondaryCta:
    'inline-flex items-center justify-center gap-2 rounded-full border border-stone-300 bg-white px-6 py-3 text-sm font-medium text-stone-900 transition-colors hover:bg-stone-50 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100 dark:hover:bg-stone-800',

  linkList:
    'flex flex-col divide-y divide-stone-200 overflow-hidden rounded-2xl border border-stone-200 bg-white dark:divide-stone-800 dark:border-stone-800 dark:bg-stone-900',
  linkItem:
    'flex items-center justify-between gap-3 px-4 py-3 text-sm text-stone-800 transition-colors hover:bg-stone-50 dark:text-stone-200 dark:hover:bg-stone-800/60',
  linkItemDisabled:
    'flex items-center justify-between gap-3 px-4 py-3 text-sm text-stone-400 cursor-not-allowed dark:text-stone-500',
  linkLeft: 'flex items-center gap-3',
  linkIcon: 'size-4 text-stone-500 dark:text-stone-400',
  linkChevron: 'size-4 text-stone-400 dark:text-stone-500',
  comingSoonTag:
    'rounded-full bg-stone-100 px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide text-stone-600 dark:bg-stone-800 dark:text-stone-300',

  signOutButton:
    'inline-flex w-full items-center justify-center gap-2 rounded-full border border-stone-300 bg-white px-6 py-3 text-sm font-medium text-stone-900 transition-colors hover:bg-stone-50 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100 dark:hover:bg-stone-800',

  sectionTitle: 'text-xs font-medium uppercase tracking-wider text-stone-500 dark:text-stone-400',

  // Tarjeta del swap de modo UI para providers. Visible solo si el rol
  // real es `provider`. El badge a la izquierda recuerda en qué modo
  // está ahora; el botón submit lanza la Server Action que invierte
  // la cookie y redirige al destino natural del nuevo modo.
  modeCard:
    'flex flex-col gap-3 rounded-2xl border border-stone-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between dark:border-stone-800 dark:bg-stone-900',
  modeInfo: 'flex flex-col gap-1',
  modeLabel: 'text-xs font-medium uppercase tracking-wider text-stone-500 dark:text-stone-400',
  modeValue: 'text-sm font-medium text-stone-900 dark:text-stone-100',
  modeHint: 'text-xs text-stone-500 dark:text-stone-400',
  modeForm: 'flex',
  modeSwitchButton:
    'inline-flex w-full items-center justify-center gap-2 rounded-full border border-stone-300 bg-white px-5 py-2.5 text-sm font-medium text-stone-900 transition-colors hover:bg-stone-50 sm:w-auto dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100 dark:hover:bg-stone-800',
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
 *  - **Autenticado:** muestra identidad (avatar + email), accesos al
 *    área cliente (reservas reales; favoritos y ajustes quedan como
 *    "Próximamente" hasta que existan las rutas) y un botón de cerrar
 *    sesión vía `SignOutButton` de Clerk.
 *
 *  Detectamos la sesión con `auth()` server-side. Cuando hay `userId`,
 *  pedimos `currentUser()` para resolver email y avatar — es un fetch
 *  extra a Clerk, pero solo se ejecuta en la rama autenticada, así que
 *  la página de bienvenida (mucho más visitada) no paga ese coste.
 */
export default async function AccountPage({ params }: AccountPageProps) {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  setRequestLocale(locale);

  const { userId, sessionClaims } = await auth();
  const isAuthenticated = userId !== null;
  // Solo pedimos `currentUser()` cuando ya sabemos que hay sesión, para
  // no abrir un fetch a Clerk en cada visita anónima a la home logueada.
  const user = isAuthenticated ? await currentUser() : null;
  const primaryEmail = user?.emailAddresses?.find(
    (e) => e.id === user.primaryEmailAddressId,
  )?.emailAddress;
  const displayName =
    [user?.firstName, user?.lastName].filter(Boolean).join(' ') || primaryEmail || '';
  const avatarUrl = user?.imageUrl;

  // Resolución de rol y modo UI activo. Sólo los providers ven la
  // tarjeta de "modo de uso" (swap usuario ⇄ proveedor). Para clientes
  // puros y admins el toggle no aplica.
  let role = isAuthenticated
    ? getRoleFromSessionClaims(
        sessionClaims as unknown as Parameters<typeof getRoleFromSessionClaims>[0],
      )
    : null;
  if (isAuthenticated && !role) {
    role = getRoleFromUser(user);
  }
  const uiMode = await getUiMode(role ?? 'client');
  const isProvider = role === 'provider';
  // En modo `provider` el botón ofrece cambiar a cliente; viceversa
  // en modo `client`. Mostramos el opuesto del modo actual.
  const nextMode = uiMode === 'provider' ? 'client' : 'provider';

  const t = await getTranslations('account');
  const tCommon = await getTranslations('common');

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
        <>
          {/* Identidad: avatar + nombre/email. Permite al usuario verificar
              con qué cuenta está logueado antes de tocar acciones. */}
          <div className={accountStyles.identityCard} data-component="account-identity">
            <div className={accountStyles.identityAvatar} aria-hidden="true">
              {avatarUrl ? (
                <Image
                  src={avatarUrl}
                  alt=""
                  width={48}
                  height={48}
                  className="size-full object-cover"
                />
              ) : (
                <span className="text-sm font-medium">
                  {(displayName || '·').slice(0, 1).toUpperCase()}
                </span>
              )}
            </div>
            <div className="flex min-w-0 flex-col">
              {displayName ? <p className={accountStyles.identityName}>{displayName}</p> : null}
              {primaryEmail ? (
                <p className={accountStyles.identityEmail}>{primaryEmail}</p>
              ) : (
                <p className={accountStyles.identityEmail}>{t('authenticated.signedInAs')}</p>
              )}
            </div>
          </div>

          <nav
            className={accountStyles.linkList}
            aria-label={t('authenticated.navLabel')}
            data-component="account-authenticated-links"
          >
            {/* "Mis reservas" sí existe como ruta (layout protegido por rol
                cliente). Favoritos y Ajustes aún no — los dejamos visibles
                como "Próximamente" en lugar de enlazar a /panel, que era el
                bug previo (los 3 links llevaban al mismo sitio). */}
            <Link href="/mis-reservas" className={accountStyles.linkItem}>
              <span className={accountStyles.linkLeft}>
                <CalendarCheck className={accountStyles.linkIcon} aria-hidden="true" />
                {t('authenticated.bookings')}
              </span>
              <ChevronRight className={accountStyles.linkChevron} aria-hidden="true" />
            </Link>
            <div className={accountStyles.linkItemDisabled} aria-disabled="true">
              <span className={accountStyles.linkLeft}>
                <Bookmark className={accountStyles.linkIcon} aria-hidden="true" />
                {t('authenticated.favorites')}
              </span>
              <span className={accountStyles.comingSoonTag}>{tCommon('comingSoon')}</span>
            </div>
            <div className={accountStyles.linkItemDisabled} aria-disabled="true">
              <span className={accountStyles.linkLeft}>
                <Settings className={accountStyles.linkIcon} aria-hidden="true" />
                {t('authenticated.settings')}
              </span>
              <span className={accountStyles.comingSoonTag}>{tCommon('comingSoon')}</span>
            </div>
          </nav>

          {/* Tarjeta de modo de uso — sólo visible para providers reales.
              Permite alternar entre la app como herramienta de gestión
              (modo `provider`) y como marketplace público (modo `client`),
              sin necesidad de crear una segunda cuenta. La preferencia se
              persiste en una cookie de 1 año (ver `lib/auth/ui-mode.ts`). */}
          {isProvider ? (
            <section
              className={accountStyles.modeCard}
              data-component="account-mode-card"
              aria-labelledby="account-mode-label"
            >
              <div className={accountStyles.modeInfo}>
                <span id="account-mode-label" className={accountStyles.modeLabel}>
                  {t('mode.label')}
                </span>
                <span className={accountStyles.modeValue}>
                  {uiMode === 'provider' ? t('mode.providerActive') : t('mode.clientActive')}
                </span>
                <span className={accountStyles.modeHint}>{t('mode.hint')}</span>
              </div>
              <form action={switchUiModeAction} className={accountStyles.modeForm}>
                <input type="hidden" name="mode" value={nextMode} />
                <input type="hidden" name="locale" value={locale} />
                <button
                  type="submit"
                  className={accountStyles.modeSwitchButton}
                  data-component="account-mode-switch"
                >
                  {nextMode === 'client' ? (
                    <UserRound className="size-4" aria-hidden="true" />
                  ) : (
                    <LayoutDashboard className="size-4" aria-hidden="true" />
                  )}
                  {nextMode === 'client' ? t('mode.switchToClient') : t('mode.switchToProvider')}
                </button>
              </form>
            </section>
          ) : null}

          {/* Logout. `SignOutButton` es un Client Component de Clerk;
              renderizarlo desde aquí (Server Component) es válido porque
              Next.js permite componer client desde server. */}
          <SignOutButton redirectUrl={`/${locale}`}>
            <button
              type="button"
              className={accountStyles.signOutButton}
              data-component="account-sign-out"
            >
              <LogOut className="size-4" aria-hidden="true" />
              {t('authenticated.signOut')}
            </button>
          </SignOutButton>
        </>
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
