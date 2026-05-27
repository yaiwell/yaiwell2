import { CalendarDays, Heart, Star, User } from 'lucide-react';
import type { ComponentType, SVGProps } from 'react';
import { useTranslations } from 'next-intl';

import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/utils';

import { customerShellStyles as s } from './CustomerShell.styles';
import type { CustomerNavItem, CustomerShellProps } from './CustomerShell.types';

/**
 * Items de navegación del área cliente. Solo `/mis-reservas` lleva a
 * una ruta real; el resto son placeholders visuales para dar
 * sensación de panel completo en la demo.
 */
const navItems: CustomerNavItem[] = [
  { href: '/mis-reservas', labelKey: 'nav.bookings', iconKey: 'calendar' },
  { href: '/mis-favoritos', labelKey: 'nav.favorites', iconKey: 'heart' },
  { href: '/mis-resenas', labelKey: 'nav.reviews', iconKey: 'star' },
  { href: '/mi-perfil', labelKey: 'nav.profile', iconKey: 'user' },
];

/** Mapa de iconKey → componente Lucide. Evita un `if/else` en JSX. */
const iconMap: Record<CustomerNavItem['iconKey'], ComponentType<SVGProps<SVGSVGElement>>> = {
  calendar: CalendarDays,
  heart: Heart,
  star: Star,
  user: User,
};

/**
 * Shell del área cliente con sidebar (desktop) / chips (móvil) +
 * espacio para el contenido principal.
 *
 * Server Component: solo lee i18n. La marca de item activo se hace
 * comparando `activePath` con cada `href` de los items.
 */
export function CustomerShell({ children, activePath }: CustomerShellProps) {
  const t = useTranslations('customerArea');

  return (
    <div className={s.root} data-component="customer-shell">
      <aside
        className={s.sidebar}
        aria-label={t('nav.ariaLabel')}
        data-component="customer-shell-sidebar"
      >
        <div className={s.identityRow}>
          <span className={s.avatar} aria-hidden="true">
            JG
          </span>
          <div>
            <p className={s.identityName}>{t('identity.demoName')}</p>
            <p className={s.identityRole}>{t('identity.role')}</p>
          </div>
        </div>
        <nav className={s.nav}>
          {navItems.map((item) => {
            const Icon = iconMap[item.iconKey];
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
