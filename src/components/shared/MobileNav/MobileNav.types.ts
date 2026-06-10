import type { LucideIcon } from 'lucide-react';

/**
 * Tipos del componente MobileNav.
 */
export interface MobileNavItem {
  href: string;
  /**
   * Clave de traducción dentro de `nav.*`. Aceptamos las del shell cliente
   * (home/search/bookings/profile) y las del shell provider (panel/venue).
   */
  labelKey: 'home' | 'search' | 'bookings' | 'profile' | 'panel' | 'venue';
  icon: LucideIcon;
}
