import { CalendarDays, Heart, Star, User } from 'lucide-react';
import Image from 'next/image';
import type { ComponentType, SVGProps } from 'react';
import { useTranslations } from 'next-intl';

import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/utils';

import { customerShellStyles as s } from './CustomerShell.styles';
import type { CustomerNavItem, CustomerShellProps } from './CustomerShell.types';

/**
 * Items de navegación del área cliente.
 *
 * Solo `/mis-reservas` está implementada hoy. Favoritos, reseñas del
 * cliente y perfil están planificadas para Fase 1 y se muestran con
 * `disabled: true` para que el usuario vea el roadmap sin caer en
 * un 404 al pulsar.
 */
const navItems: CustomerNavItem[] = [
  { href: '/mis-reservas', labelKey: 'nav.bookings', iconKey: 'calendar' },
  { href: '/mis-favoritos', labelKey: 'nav.favorites', iconKey: 'heart', disabled: true },
  { href: '/mis-resenas', labelKey: 'nav.reviews', iconKey: 'star', disabled: true },
  { href: '/mi-perfil', labelKey: 'nav.profile', iconKey: 'user', disabled: true },
];

/** Mapa de iconKey → componente Lucide. Evita un `if/else` en JSX. */
const iconMap: Record<CustomerNavItem['iconKey'], ComponentType<SVGProps<SVGSVGElement>>> = {
  calendar: CalendarDays,
  heart: Heart,
  star: Star,
  user: User,
};

/**
 * Calcula 1-2 iniciales para el avatar fallback a partir del display
 * name del usuario. Si solo hay una palabra, usa la primera letra; si
 * hay dos o más, combina las iniciales de las dos primeras.
 */
function getInitials(displayName: string, fallbackEmail: string): string {
  const source = displayName.trim() || fallbackEmail.trim() || '·';
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return parts[0].slice(0, 1).toUpperCase();
}

/**
 * Shell del área cliente con sidebar (desktop) / chips (móvil) +
 * espacio para el contenido principal.
 *
 * Server Component: lee i18n y muestra la identidad real del usuario
 * autenticado (avatar/nombre vienen del layout, resueltos desde Clerk).
 * La marca de item activo se hace comparando `activePath` con cada
 * `href` de los items.
 */
export function CustomerShell({ children, activePath, identity }: CustomerShellProps) {
  const t = useTranslations('customerArea');
  const tCommon = useTranslations('common');
  const initials = getInitials(identity.displayName, identity.email);
  // Si no hay displayName explícito caemos al email para no mostrar
  // un nombre vacío en la sidebar.
  const visibleName = identity.displayName || identity.email;

  return (
    <div className={s.root} data-component="customer-shell">
      <aside
        className={s.sidebar}
        aria-label={t('nav.ariaLabel')}
        data-component="customer-shell-sidebar"
      >
        <div className={s.identityRow}>
          <span className={s.avatar} aria-hidden="true">
            {identity.avatarUrl ? (
              <Image
                src={identity.avatarUrl}
                alt=""
                width={48}
                height={48}
                className={s.avatarImage}
              />
            ) : (
              initials
            )}
          </span>
          <div className={s.identityInfo}>
            <p className={s.identityName}>{visibleName}</p>
            <p className={s.identityRole}>{t('identity.role')}</p>
          </div>
        </div>
        <nav className={s.nav}>
          {navItems.map((item) => {
            const Icon = iconMap[item.iconKey];
            // Item pendiente de implementar: render como pill apagado
            // con chip "Próximamente" en lugar de `<Link>` activo.
            if (item.disabled) {
              return (
                <span
                  key={item.href}
                  className={s.navItemDisabled}
                  aria-disabled="true"
                  title={tCommon('comingSoon')}
                  data-component={`customer-nav-${item.iconKey}-disabled`}
                >
                  <Icon className={s.navIcon} aria-hidden="true" />
                  {t(item.labelKey)}
                  <span className={s.navItemComingSoon}>{tCommon('comingSoon')}</span>
                </span>
              );
            }
            const isActive = activePath === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(s.navItem, isActive && s.navItemActive)}
                aria-current={isActive ? 'page' : undefined}
                data-component={`customer-nav-${item.iconKey}`}
              >
                <Icon className={s.navIcon} aria-hidden="true" />
                {t(item.labelKey)}
              </Link>
            );
          })}
        </nav>
      </aside>

      <section className={s.main} data-component="customer-shell-main">
        {children}
      </section>
    </div>
  );
}
