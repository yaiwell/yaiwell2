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
  /**
   * Si es `true`, el item se renderiza como pill no clickable con un
   * chip "Próximamente". Patrón espejo del que ya usa `/cuenta` para
   * las features que aún no existen como ruta (Fase 1).
   */
  disabled?: boolean;
}

/**
 * Datos del usuario autenticado que la shell necesita para renderizar
 * la tarjeta de identidad. Resueltos en el layout server-side desde
 * Clerk y pasados como prop para que la shell sea agnóstica de auth.
 */
export interface CustomerShellIdentity {
  /** Nombre legible (firstName + lastName) o email si no hay nombre. */
  displayName: string;
  /** Email principal — útil como fallback y para subtítulo. */
  email: string;
  /** URL del avatar de Clerk (puede ser undefined). */
  avatarUrl?: string;
}

export interface CustomerShellProps {
  children: ReactNode;
  /** Ruta actual sin prefijo de locale, ej. `/mis-reservas`. */
  activePath: string;
  /** Identidad del usuario autenticado, resuelta en el layout. */
  identity: CustomerShellIdentity;
}
