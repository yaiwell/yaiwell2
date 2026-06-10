import { auth } from '@clerk/nextjs/server';
import { LayoutDashboard, Sparkles, User } from 'lucide-react';
import { getTranslations } from 'next-intl/server';

import { Link } from '@/i18n/navigation';
import { Button } from '@/components/ui/button';
import { LangSwitcher } from '@/components/shared/LangSwitcher';
import { LocationPill } from '@/components/shared/LocationPill';
import { ThemeToggle } from '@/components/shared/ThemeToggle';
import { getRoleFromSessionClaims } from '@/lib/auth/role';

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
 *
 * Las CTAs "Entrar / Registrarse" solo se muestran a usuarios anónimos.
 * Con sesión activa mostramos un acceso directo a la "cuenta" (que ya
 * resuelve el destino real según rol: cliente, proveedor o admin) — el
 * logout vive en `/cuenta` para no abarrotar la barra. Esto es un
 * Server Component: usa `auth()` de Clerk en el servidor para no
 * necesitar JS de hidratación solo para distinguir sesión.
 */
export async function Header() {
  const tNav = await getTranslations('nav');
  const tCommon = await getTranslations('common');
  const { userId, sessionClaims } = await auth();
  const isAuthenticated = userId !== null;
  // Si hay sesión, intentamos resolver el destino natural del usuario:
  // proveedor → /panel, admin → /admin, cliente → /cuenta. Usamos los
  // sessionClaims directamente (sin `currentUser()`) para no añadir un
  // fetch en cada render del Header — si los claims no traen rol,
  // caemos a '/cuenta' que es seguro para cualquier sesión.
  // Cast defensivo: el `JwtPayload` real de Clerk no expone publicMetadata
  // en su tipo, pero sí en runtime si hay JWT template configurado.
  // `getRoleFromSessionClaims` hace el narrowing seguro de cada campo.
  const role = isAuthenticated
    ? getRoleFromSessionClaims(
        sessionClaims as unknown as Parameters<typeof getRoleFromSessionClaims>[0],
      )
    : null;
  const accountHref = role === 'provider' ? '/panel' : role === 'admin' ? '/admin' : '/cuenta';

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
          {!isAuthenticated ? (
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
                {role === 'provider' ? (
                  <LayoutDashboard className="size-4" aria-hidden="true" />
                ) : (
                  <User className="size-4" aria-hidden="true" />
                )}
                {role === 'provider' ? tNav('panel') : tNav('account')}
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
