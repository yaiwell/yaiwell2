import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { buttonVariants } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';

import { weeklyCalendarStyles as s } from './WeeklyCalendar.styles';
import type { CalendarWeekNav } from './WeeklyCalendar.types';

/** Ruta del calendario; la semana viaja en `?semana=` con la clave del lunes. */
const CALENDAR_PATH = '/panel/calendario';

function weekHref(weekKey: string) {
  return { pathname: CALENDAR_PATH, query: { semana: weekKey } };
}

/**
 * Navegación entre semanas con enlaces normales (sin JavaScript): cada
 * semana tiene su URL, se puede compartir y el botón «atrás» del
 * navegador funciona. «Hoy» vuelve a la URL limpia.
 */
export function WeekNavigation({ nav }: { nav: CalendarWeekNav }) {
  const t = useTranslations('providerPanel.calendar.nav');
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
          href={CALENDAR_PATH}
          className={buttonVariants({ variant: 'ghost', size: 'sm' })}
          data-component="weekly-calendar-nav-today"
        >
          {t('today')}
        </Link>
      )}
    </nav>
  );
}
