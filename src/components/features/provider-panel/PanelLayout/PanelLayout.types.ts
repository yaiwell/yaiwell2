import type { LucideIcon } from 'lucide-react';

/**
 * Item de navegación del panel del proveedor.
 *
 * Se usa tanto en la sidebar (desktop) como en la bottom tab bar
 * (mobile) — el icono y la clave i18n son los mismos.
 */
export interface PanelNavItem {
  href: string;
  /** Clave dentro del namespace `providerPanel.nav`. */
  labelKey: 'dashboard' | 'calendar' | 'services' | 'settings' | 'reviews';
  icon: LucideIcon;
}

/** Props del layout del panel. */
export interface PanelLayoutProps {
  children: React.ReactNode;
  /** Nombre del centro/profesional activo para el bloque de identidad. */
  providerName: string;
}
