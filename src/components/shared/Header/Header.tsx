import { useTranslations } from 'next-intl';
import { Menu, Sparkles } from 'lucide-react';

import { Link } from '@/i18n/navigation';
import { Button } from '@/components/ui/button';
import { LangSwitcher } from '@/components/shared/LangSwitcher';

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
 * desktop muestra nav central + acciones a la derecha; en mobile colapsa a
 * logo + cambio de idioma + botón hamburguesa (placeholder visual sin
 * lógica de menú lateral todavía — se abordará cuando definamos el flujo
 * autenticado completo).
 */
export function Header() {
  const tNav = useTranslations('nav');
  const tCommon = useTranslations('common');

  return (
    <header className={s.root}>
      <div className={s.container}>
        {/* Marca: logotipo a la izquierda. */}
        <Link href="/" className={s.brand} aria-label={tCommon('appName')}>
          <span className={s.brandMark} aria-hidden="true">
            <Sparkles className="size-4" />
          </span>
          <span className={s.brandText}>{tCommon('appName')}</span>
        </Link>

        {/* Navegación central (solo desktop). */}
        <nav className={s.desktopNav} aria-label={tNav('home')}>
          {navItems.map((item) => (
            <Link key={item.href} href={item.href} className={s.navLink}>
              {tNav(item.labelKey)}
            </Link>
          ))}
        </nav>

        {/* Acciones a la derecha en desktop. */}
        <div className={s.desktopActions}>
          <Link href="/profesionales" className={s.desktopProvidersLink}>
            {tNav('forProviders')}
          </Link>
          <LangSwitcher />
          <Button asChild variant="outline" size="lg">
            <Link href="/entrar">{tNav('signIn')}</Link>
          </Button>
          <Button asChild size="lg">
            <Link href="/registro">{tNav('signUp')}</Link>
          </Button>
        </div>

        {/* Acciones compactas en mobile. */}
        <div className={s.mobileActions}>
          <LangSwitcher compact />
          {/* Placeholder visual: el menú lateral lo implementaremos cuando
              tengamos el flujo autenticado real. */}
          <button type="button" className={s.iconButton} aria-label={tNav('openMenu')}>
            <Menu className="size-5" />
          </button>
        </div>
      </div>
    </header>
  );
}
