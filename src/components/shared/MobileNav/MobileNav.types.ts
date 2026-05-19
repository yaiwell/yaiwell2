import type { LucideIcon } from 'lucide-react';

/**
 * Tipos del componente MobileNav.
 */
export interface MobileNavItem {
  href: string;
  labelKey: 'home' | 'search' | 'bookings' | 'profile';
  icon: LucideIcon;
}
