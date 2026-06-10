'use client';

import { Link } from '@/i18n/navigation';

import { useIsActivePanelLink } from './PanelLayout.logic';
import { panelLayoutStyles as s } from './PanelLayout.styles';
import type { PanelNavItem } from './PanelLayout.types';

/**
 * Sub-componentes cliente del `PanelLayout`.
 *
 * Viven en un archivo aparte con `'use client'` porque invocan
 * `useIsActivePanelLink` (hook cliente que llama a `usePathname`). El
 * `PanelLayout` padre se mantiene como Server Component y los importa
 * como componentes — eso sí está permitido en el modelo RSC, pero llamar
 * al hook directamente desde el padre no.
 */

interface PanelLayoutLinkProps {
  item: PanelNavItem;
  label: string;
}

/**
 * Link de la sidebar desktop. Marca `aria-current="page"` cuando la
 * ruta del item coincide con la actual.
 */
export function PanelLayoutLink({ item, label }: PanelLayoutLinkProps) {
  const isActive = useIsActivePanelLink(item.href);
  const Icon = item.icon;
  const className = isActive ? `${s.sidebarLink} ${s.sidebarLinkActive}` : s.sidebarLink;

  return (
    <Link
      href={item.href}
      className={className}
      aria-current={isActive ? 'page' : undefined}
      data-component={`panel-sidebar-link-${item.labelKey}`}
    >
      <Icon className={s.sidebarLinkIcon} aria-hidden />
      {label}
    </Link>
  );
}

/**
 * Versión compacta para la bottom tab bar móvil.
 * Comparte ítems y resaltado con la sidebar.
 */
export function PanelBottomNavLink({ item, label }: PanelLayoutLinkProps) {
  const isActive = useIsActivePanelLink(item.href);
  const Icon = item.icon;
  const className = isActive ? `${s.bottomNavLink} ${s.bottomNavLinkActive}` : s.bottomNavLink;

  return (
    <Link
      href={item.href}
      className={className}
      aria-current={isActive ? 'page' : undefined}
      data-component={`panel-bottom-nav-link-${item.labelKey}`}
    >
      <Icon className={s.bottomNavIcon} aria-hidden />
      {label}
    </Link>
  );
}
