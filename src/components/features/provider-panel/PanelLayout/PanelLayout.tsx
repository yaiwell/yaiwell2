import { CalendarDays, LayoutDashboard, Scissors, Settings, Star } from 'lucide-react';
import { useTranslations } from 'next-intl';

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
 * Es un Server Component que delega el cálculo de "ruta activa" a los
 * sub-componentes cliente declarados en `PanelLayout.links.tsx`. La
 * extracción a otro módulo es obligatoria: un Server Component puede
 * renderizar componentes cliente, pero no puede llamar a hooks cliente
 * directamente (lo que rompió este layout en producción al invocar
 * `useIsActivePanelLink` desde funciones definidas aquí).
 */
export function PanelLayout({ children, providerName }: PanelLayoutProps) {
  const tNav = useTranslations('providerPanel.nav');

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
