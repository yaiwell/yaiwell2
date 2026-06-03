'use client';

import { CalendarDays, Home, Search, User } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Link, usePathname } from '@/i18n/navigation';
import { cn } from '@/lib/utils';

import { useIsActiveTab } from './MobileNav.logic';
import { mobileNavStyles as s } from './MobileNav.styles';
import type { MobileNavItem } from './MobileNav.types';

/**
 * Configuración estática de las pestañas del bottom tab bar.
 *
 * Mantenerla como constante a nivel de módulo evita recrearla en cada
 * render y la hace fácil de extender (por ejemplo, añadir badges de
 * notificaciones más adelante).
 */
const items: MobileNavItem[] = [
  { href: '/', labelKey: 'home', icon: Home },
  { href: '/buscar', labelKey: 'search', icon: Search },
  { href: '/reservas', labelKey: 'bookings', icon: CalendarDays },
  { href: '/perfil', labelKey: 'profile', icon: User },
];

/**
 * Barra de navegación inferior para dispositivos móviles.
 *
 * Patrón clásico de app nativa: 4 pestañas con icono + etiqueta. Se oculta
 * en >=768px porque ahí el Header desktop ya cubre la navegación.
 *
 * Bajo `/panel/*` el panel de proveedor renderiza su propio bottom nav
 * (`PanelLayout.bottomNav`). Para evitar dos barras apiladas en móvil
 * (audit 2026-05-27 §A.9), ocultamos esta cuando estamos en esa rama.
 * El panel admin (`/admin`) también se considera UI interna y se oculta
 * por la misma razón.
 */
export function MobileNav() {
  const t = useTranslations('nav');
  const pathname = usePathname();

  // Rutas con su propia navegación: no duplicar el bottom tab bar global.
  if (pathname.startsWith('/panel') || pathname.startsWith('/admin')) {
    return null;
  }

  return (
    <nav className={s.root} aria-label={t('bottomNavLabel')} data-component="mobile-nav">
      <ul className={s.inner}>
        {items.map((item) => (
          <MobileNavLink key={item.href} item={item} label={t(item.labelKey)} />
        ))}
      </ul>
    </nav>
  );
}

interface MobileNavLinkProps {
  item: MobileNavItem;
  label: string;
}

/**
 * Sub-componente por pestaña.
 *
 * Vive aquí porque consume el hook `useIsActiveTab` (necesario por
 * pestaña, no para el conjunto) y mantenerlo cerca evita un archivo extra
 * sin ganancia real de claridad.
 */
function MobileNavLink({ item, label }: MobileNavLinkProps) {
  const isActive = useIsActiveTab(item.href);
  const Icon = item.icon;

  return (
    <li>
      <Link
        href={item.href}
        className={cn(s.link, isActive && s.linkActive)}
        aria-current={isActive ? 'page' : undefined}
        data-component={`mobile-nav-tab-${item.labelKey}`}
      >
        <span className={cn(s.iconWrap, isActive && s.iconWrapActive)}>
          <Icon className="size-5" aria-hidden="true" />
        </span>
        <span className={s.label}>{label}</span>
      </Link>
    </li>
  );
}
