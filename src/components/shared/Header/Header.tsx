import { auth } from '@clerk/nextjs/server';
import { LayoutDashboard, Sparkles, User } from 'lucide-react';
import { getTranslations } from 'next-intl/server';

import { Link } from '@/i18n/navigation';
import { Button } from '@/components/ui/button';
import { LangSwitcher } from '@/components/shared/LangSwitcher';
import { LocationPill } from '@/components/shared/LocationPill';
import { ThemeToggle } from '@/components/shared/ThemeToggle';
import type { UiMode } from '@/lib/auth/ui-mode.types';

import { headerStyles as s } from './Header.styles';
import type { HeaderNavItem } from './Header.types';

/**
 * Items de navegación principal en desktop para el shell cliente.
 *
 * En modo provider la nav central se oculta — el usuario está usando la
 * app como herramienta de gestión y debe ir al panel, no a buscar.
 */
const clientNavItems: HeaderNavItem[] = [
  { href: '/', labelKey: 'home' },
  { href: '/buscar', labelKey: 'search' },
];

export interface HeaderProps {
  /**
   * Modo de UI activo (resuelto en el layout raíz). Determina el shell:
   *  - `client`: nav pública (Inicio/Buscar) + CTAs anónimo o "Mi cuenta".
   *  - `provider`: nav vacía + acceso directo a "Mi panel".
   */
  mode: UiMode;
}

/**
 * Header principal de la app.
 *
 * Sticky en top, sirve de ancla visual de marca en todas las páginas. En
 * desktop muestra nav central + acciones a la derecha; en mobile la
 * navegación principal se delega al `MobileNav` fijo en el bottom, por lo
 * que aquí sólo aparecen logo + `LangSwitcher`. (Decisión post-feedback:
 * el botón hamburguesa duplicaba navegación y se eliminó.)
 *
 * Cuando el usuario está en modo provider, el Header se simplifica: se
 * ocultan los items "Inicio / Buscar / Para profesionales" porque no
 * forman parte de su flujo de trabajo. Mantiene solo logo, idioma, tema
 * y un CTA hacia el panel. Esto es un Server Component: usa `auth()` de
 * Clerk en el servidor para distinguir sesión sin JS de hidratación.
 */
export async function Header({ mode }: HeaderProps) {
  const tNav = await getTranslations('nav');
  const tCommon = await getTranslations('common');
  const { userId } = await auth();
  const isAuthenticated = userId !== null;
  const isProviderMode = mode === 'provider';
  // En modo cliente autenticado el CTA lleva a /cuenta. En modo provider
  // lleva al panel. Anónimos no ven CTA único — ven entrar/registrarse.
  const accountHref = isProviderMode ? '/panel' : '/cuenta';

  return (
    <header className={s.root} data-component="header">
      <div className={s.container}>
        {/* Marca: logotipo a la izquierda. */}
        <Link
          href="/"
          className={s.brand}
          aria-label={tCommon('appName')}
          data-component="header-brand"
        >
          <span className={s.brandMark} aria-hidden="true">
            <Sparkles className="size-4" />
          </span>
          <span className={s.brandText}>{tCommon('appName')}</span>
        </Link>

        {/* Navegación central solo en modo cliente. Modo provider tiene
            su propia nav dentro del PanelLayout. */}
        {!isProviderMode ? (
          <nav
            className={s.desktopNav}
            aria-label={tNav('primaryNavLabel')}
            data-component="header-nav"
          >
            {clientNavItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={s.navLink}
                data-component={`header-nav-${item.labelKey}`}
              >
                {tNav(item.labelKey)}
              </Link>
            ))}
          </nav>
        ) : null}

        {/* Acciones a la derecha en desktop. */}
        <div className={s.desktopActions} data-component="header-desktop-actions">
          {/* "Para profesionales" solo aparece a anónimos en modo
              cliente: en modo provider ya estás dentro de ese mundo. */}
          {!isAuthenticated && !isProviderMode ? (
            <Link
              href="/profesionales"
              className={s.desktopProvidersLink}
              data-component="header-providers-link"
            >
              {tNav('forProviders')}
            </Link>
          ) : null}
          <ThemeToggle />
          <LocationPill />
          <LangSwitcher />
          {isAuthenticated ? (
            <Button asChild variant="outline" size="lg" data-component="header-account">
              <Link href={accountHref} className="inline-flex items-center gap-2">
                {isProviderMode ? (
                  <LayoutDashboard className="size-4" aria-hidden="true" />
                ) : (
                  <User className="size-4" aria-hidden="true" />
                )}
                {isProviderMode ? tNav('panel') : tNav('account')}
              </Link>
            </Button>
          ) : (
            <>
              <Button asChild variant="outline" size="lg" data-component="header-sign-in">
                <Link href="/entrar">{tNav('signIn')}</Link>
              </Button>
              <Button asChild size="lg" data-component="header-sign-up">
                <Link href="/registro">{tNav('signUp')}</Link>
              </Button>
            </>
          )}
        </div>

        {/* Acciones compactas en mobile: tema + cambio de idioma. La
            navegación principal vive en `MobileNav` (bottom tab bar). */}
        <div className={s.mobileActions} data-component="header-mobile-actions">
          <ThemeToggle compact />
          <LocationPill />
          <LangSwitcher compact />
        </div>
      </div>
    </header>
  );
}
