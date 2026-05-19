'use client';

import { usePathname } from '@/i18n/navigation';

/**
 * Determina si una ruta del MobileNav está activa para el pathname actual.
 *
 * Regla:
 * - `/` solo se considera activo cuando el pathname es exactamente `/`.
 * - El resto activan también para sub-rutas (ej. `/buscar/centro/123`
 *   marca activa la pestaña "Buscar").
 *
 * El pathname devuelto por `@/i18n/navigation` ya viene sin el prefijo de
 * locale, así que podemos comparar directamente.
 */
export function useIsActiveTab(href: string): boolean {
  const pathname = usePathname();
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(`${href}/`);
}
