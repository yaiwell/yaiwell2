import type { ReactNode } from 'react';

/**
 * Item de navegación lateral del área cliente.
 *
 * `href` debe ser absoluto y compatible con el `Link` de next-intl.
 * `iconKey` es la clave del icono para que el componente lo resuelva
 * sin acoplar el array de items al objeto Icon.
 */
/**
 * Claves i18n posibles para los items de navegación.
 * Restringido al subset del namespace `customerArea.nav` que usamos
 * para que next-intl valide en tiempo de compilación.
 */
export type CustomerNavLabelKey = 'nav.bookings' | 'nav.favorites' | 'nav.reviews' | 'nav.profile';

export interface CustomerNavItem {
  href: string;
  labelKey: CustomerNavLabelKey;
  iconKey: 'calendar' | 'star' | 'user' | 'heart';
}

export interface CustomerShellProps {
  children: ReactNode;
  /** Ruta actual sin prefijo de locale, ej. `/mis-reservas`. */
  activePath: string;
}
