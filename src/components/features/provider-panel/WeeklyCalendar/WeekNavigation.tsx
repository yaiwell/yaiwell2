import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { buttonVariants } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';

import { calendarHref } from './WeeklyCalendar.links';
import { weeklyCalendarStyles as s } from './WeeklyCalendar.styles';
import type { CalendarWeekNav } from './WeeklyCalendar.types';

interface WeekNavigationProps {
  nav: CalendarWeekNav;
  /** Profesional del filtro, que se conserva al cambiar de semana. */
  professionalId?: string | null;
}

/**
 * Navegación entre semanas con enlaces normales (sin JavaScript): cada
 * semana tiene su URL, se puede compartir y el botón «atrás» del
 * navegador funciona. «Hoy» vuelve a la semana actual sin perder el
 * filtro por profesional.
 */
export function WeekNavigation({ nav, professionalId = null }: WeekNavigationProps) {
  const t = useTranslations('providerPanel.calendar.nav');
  const weekHref = (week: string) => calendarHref({ week, professionalId });
  const iconButton = buttonVariants({ variant: 'outline', size: 'icon-lg' });

  return (
    <nav className={s.nav} aria-label={t('region')} data-component="weekly-calendar-nav">
      <Link
        href={weekHref(nav.previousWeek)}
        className={iconButton}
        aria-label={t('previous')}
        data-component="weekly-calendar-nav-previous"
      >
        <ChevronLeft className={s.navIcon} aria-hidden />
      </Link>
      <p className={s.navLabel} data-component="weekly-calendar-nav-label">
        {t('label', { start: nav.startLabel, end: nav.endLabel })}
      </p>
      <Link
        href={weekHref(nav.nextWeek)}
        className={iconButton}
        aria-label={t('next')}
        data-component="weekly-calendar-nav-next"
      >
        <ChevronRight className={s.navIcon} aria-hidden />
      </Link>
      {!nav.isCurrentWeek && (
        <Link
          href={calendarHref({ professionalId })}
          className={buttonVariants({ variant: 'ghost', size: 'sm' })}
          data-component="weekly-calendar-nav-today"
        >
          {t('today')}
        </Link>
      )}
    </nav>
  );
}
