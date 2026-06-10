'use client';

import { CalendarDays, Home, LayoutDashboard, Search, Store, User } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Link, usePathname } from '@/i18n/navigation';
import { cn } from '@/lib/utils';

import type { UiMode } from '@/lib/auth/ui-mode.types';

import { useIsActiveTab } from './MobileNav.logic';
import { mobileNavStyles as s } from './MobileNav.styles';
import type { MobileNavItem } from './MobileNav.types';

/**
 * Pestañas del bottom tab bar para clientes / anónimos.
 *
 * Refleja el shell público de marketplace: Inicio + Buscar + Mis reservas
 * + Cuenta (pasarela de identidad / login).
 */
const clientItems: MobileNavItem[] = [
  { href: '/', labelKey: 'home', icon: Home },
  { href: '/buscar', labelKey: 'search', icon: Search },
  // `/mis-reservas` es la ruta real del área cliente. La pestaña
  // "Cuenta" apunta a `/cuenta`, una página puente que muestra CTAs de
  // entrar/registrarse cuando no hay sesión y los accesos del usuario
  // cuando sí la hay.
  { href: '/mis-reservas', labelKey: 'bookings', icon: CalendarDays },
  { href: '/cuenta', labelKey: 'profile', icon: User },
];

/**
 * Pestañas del bottom tab bar para proveedores autenticados.
 *
 * La app se convierte en herramienta de gestión: el shell público
 * (Inicio/Buscar/Reservas) deja de tener sentido porque el provider
 * no opera como cliente — gestiona su centro y revisa su agenda. Los
 * 3 items cubren los flujos que más necesita fuera del propio panel:
 *  - **Panel**: vuelta al dashboard.
 *  - **Centro**: configuración del local (datos, fotos, horarios).
 *  - **Perfil**: identidad + cerrar sesión.
 */
const providerItems: MobileNavItem[] = [
  { href: '/panel', labelKey: 'panel', icon: LayoutDashboard },
  { href: '/panel/centro', labelKey: 'venue', icon: Store },
  { href: '/cuenta', labelKey: 'profile', icon: User },
];

export interface MobileNavProps {
  /**
   * Modo de UI activo (resuelto en el layout raíz a partir del rol real
   * de Clerk + cookie `yaiwell.uiMode`). Determina qué set de pestañas
   * se muestra. Cliente puro y anónimo siempre reciben `client`; sólo
   * el provider real puede recibir `provider`.
   */
  mode: UiMode;
}

/**
 * Barra de navegación inferior para dispositivos móviles.
 *
 * Patrón clásico de app nativa: 3-4 pestañas con icono + etiqueta. Se
 * oculta en >=768px porque ahí el Header desktop ya cubre la navegación.
 *
 * Bajo `/panel/*` el panel de proveedor renderiza su propio bottom nav
 * (`PanelLayout.bottomNav`). Para evitar dos barras apiladas en móvil
 * (audit 2026-05-27 §A.9), ocultamos esta cuando estamos en esa rama.
 * El panel admin (`/admin`) también se considera UI interna y se oculta
 * por la misma razón.
 *
 * El set de items depende del rol: proveedor ve un shell de gestión
 * (Panel/Centro/Perfil); cliente y anónimo ven el shell público
 * (Inicio/Buscar/Reservas/Cuenta).
 */
export function MobileNav({ mode }: MobileNavProps) {
  const t = useTranslations('nav');
  const pathname = usePathname();

  // Rutas con su propia navegación: no duplicar el bottom tab bar global.
  if (pathname.startsWith('/panel') || pathname.startsWith('/admin')) {
    return null;
  }

  const items = mode === 'provider' ? providerItems : clientItems;

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
