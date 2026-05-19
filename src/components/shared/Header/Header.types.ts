/**
 * Tipos específicos del componente Header.
 *
 * Los tipos compartidos del dominio viven en `/types/domain.ts`. Aquí
 * mantenemos solo lo que el Header necesita internamente.
 */
export interface HeaderNavItem {
  href: string;
  labelKey: 'home' | 'search';
}
