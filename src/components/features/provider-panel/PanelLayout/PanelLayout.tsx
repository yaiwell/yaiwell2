'use client';

import { CalendarDays, LayoutDashboard, Scissors, Settings, Star, UserRound } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';

import { switchUiModeAction } from '@/app/[locale]/cuenta/ui-mode.actions';

import { PanelBottomNavLink, PanelLayoutLink } from './PanelLayout.links';
import { panelLayoutStyles as s } from './PanelLayout.styles';
import type { PanelLayoutProps, PanelNavItem } from './PanelLayout.types';

/**
 * Items de navegación del panel. Configurados como constante a nivel
 * de módulo para que el array no se recree en cada render del layout.
 */
const navItems: PanelNavItem[] = [
  { href: '/panel', labelKey: 'dashboard', icon: LayoutDashboard },
  { href: '/panel/calendario', labelKey: 'calendar', icon: CalendarDays },
  { href: '/panel/servicios', labelKey: 'services', icon: Scissors },
  { href: '/panel/centro', labelKey: 'settings', icon: Settings },
  { href: '/panel/valoraciones', labelKey: 'reviews', icon: Star },
];

/**
 * Layout del área privada del proveedor.
 *
 * - Desktop (>=1024px): sidebar persistente a la izquierda con la
 *   identidad del centro y la navegación principal del panel.
 * - Mobile: oculta la sidebar y muestra una bottom tab bar flotante con
 *   los mismos accesos, situada justo encima del MobileNav global.
 *
 * Es un Client Component. Aunque el árbol no tiene estado propio, los
 * `navItems` referencian iconos de Lucide (`forwardRef`) y se pasan a
 * `PanelLayoutLink` / `PanelBottomNavLink` (clientes). Si este shell
 * fuese Server Component, RSC intentaría serializar el icono como prop
 * y rompería en producción con "Functions cannot be passed directly to
 * Client Components" (digest 1621801304). Mantener todo el shell en
 * cliente evita la frontera de serialización; el coste en bundle es
 * nulo porque los iconos ya viajaban al cliente vía `PanelLayoutLink`.
 *
 * El cálculo de "ruta activa" sigue viviendo en `PanelLayout.links.tsx`
 * porque cada link instancia `useIsActivePanelLink` (que llama a
 * `usePathname`).
 */
export function PanelLayout({ children, providerName }: PanelLayoutProps) {
  const tNav = useTranslations('providerPanel.nav');
  // Reutilizamos los textos del namespace `account.mode` para no duplicar
  // strings: ya están traducidos en los 4 locales y describen la misma
  // acción (alternar entre modo proveedor y modo cliente).
  const tMode = useTranslations('account.mode');
  // `locale` se pasa al server action como hidden input para que el
  // redirect final respete el idioma actual del usuario.
  const locale = useLocale();

  return (
    <div className={s.root} data-component="panel-layout">
      <aside className={s.sidebar} data-component="panel-sidebar">
        <div className={s.sidebarHeader}>
          <span className={s.sidebarKicker}>{tNav('providerLabel')}</span>
          <h2 className={s.sidebarTitle}>{tNav('title')}</h2>
          <p className={s.sidebarProvider}>{providerName}</p>
        </div>
        <nav className={s.sidebarNav} aria-label={tNav('sidebarNavLabel')}>
          {navItems.map((item) => (
            <PanelLayoutLink key={item.href} item={item} label={tNav(item.labelKey)} />
          ))}
        </nav>

        {/* Footer de la sidebar: toggle de modo UI hacia cliente. En el
            panel siempre se está en modo `provider`, así que el destino
            del swap es fijo (`client`). El propio Server Action verifica
            de nuevo el rol antes de escribir la cookie. */}
        <div className={s.sidebarFooter} data-component="panel-sidebar-footer">
          <form action={switchUiModeAction} className={s.sidebarSwitchForm}>
            <input type="hidden" name="mode" value="client" />
            <input type="hidden" name="locale" value={locale} />
            <button
              type="submit"
              className={s.sidebarSwitchButton}
              data-component="panel-mode-switch"
            >
              <UserRound className="size-4" aria-hidden />
              {tMode('switchToClient')}
            </button>
          </form>
        </div>
      </aside>

      <section className={s.content} data-component="panel-content">
        {children}
      </section>

      <nav
        className={s.bottomNav}
        aria-label={tNav('bottomNavLabel')}
        data-component="panel-bottom-nav"
      >
        {navItems.map((item) => (
          <PanelBottomNavLink key={item.href} item={item} label={tNav(item.labelKey)} />
        ))}
      </nav>
    </div>
  );
}
