'use client';

import { usePathname } from '@/i18n/navigation';

/**
 * Devuelve `true` si la ruta actual coincide o cuelga del href dado.
 *
 * Caso especial: el dashboard (`/panel`) solo se considera activo cuando
 * la ruta es exactamente `/panel`, para no permanecer marcado al navegar
 * a sub-secciones como `/panel/servicios`.
 */
export function useIsActivePanelLink(href: string): boolean {
  const pathname = usePathname();
  if (href === '/panel') return pathname === '/panel';
  return pathname === href || pathname.startsWith(`${href}/`);
}
