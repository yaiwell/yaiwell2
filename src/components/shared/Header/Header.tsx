import { useTranslations } from 'next-intl';
import { Sparkles } from 'lucide-react';

import { Link } from '@/i18n/navigation';
import { Button } from '@/components/ui/button';
import { LangSwitcher } from '@/components/shared/LangSwitcher';
import { LocationPill } from '@/components/shared/LocationPill';
import { ThemeToggle } from '@/components/shared/ThemeToggle';

import { headerStyles as s } from './Header.styles';
import type { HeaderNavItem } from './Header.types';

/**
 * Items de navegación principal en desktop.
 *
 * El item "Categorías" se renderiza como link a `/buscar` por ahora; cuando
 * tengamos un menú real con subcategorías abriremos un dropdown.
 */
const navItems: HeaderNavItem[] = [
  { href: '/', labelKey: 'home' },
  { href: '/buscar', labelKey: 'search' },
];

/**
 * Header principal de la app.
 *
 * Sticky en top, sirve de ancla visual de marca en todas las páginas. En
 * desktop muestra nav central + acciones a la derecha; en mobile la
 * navegación principal se delega al `MobileNav` fijo en el bottom, por lo
 * que aquí sólo aparecen logo + `LangSwitcher`. (Decisión post-feedback:
 * el botón hamburguesa duplicaba navegación y se eliminó.)
 */
export function Header() {
  const tNav = useTranslations('nav');
  const tCommon = useTranslations('common');

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

        {/* Navegación central (solo desktop). */}
        <nav
          className={s.desktopNav}
          aria-label={tNav('primaryNavLabel')}
          data-component="header-nav"
        >
          {navItems.map((item) => (
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

        {/* Acciones a la derecha en desktop. */}
        <div className={s.desktopActions} data-component="header-desktop-actions">
          <Link
            href="/profesionales"
            className={s.desktopProvidersLink}
            data-component="header-providers-link"
          >
            {tNav('forProviders')}
          </Link>
          <ThemeToggle />
          <LocationPill />
          <LangSwitcher />
          <Button asChild variant="outline" size="lg" data-component="header-sign-in">
            <Link href="/entrar">{tNav('signIn')}</Link>
          </Button>
          <Button asChild size="lg" data-component="header-sign-up">
            <Link href="/registro">{tNav('signUp')}</Link>
          </Button>
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
