import { useTranslations } from 'next-intl';

import { Link } from '@/i18n/navigation';

import { calendarHref } from './WeeklyCalendar.links';
import { buildProfessionalFilterOptions } from './WeeklyCalendar.logic';
import { weeklyCalendarStyles as s } from './WeeklyCalendar.styles';
import type { PanelTeamMember } from './WeeklyCalendar.types';

interface ProfessionalFilterProps {
  team: PanelTeamMember[];
  /** Profesional elegido; `null` = todos. */
  selectedId: string | null;
  /** Semana a conservar en los enlaces; `null` en la semana actual. */
  week: string | null;
}

/**
 * Fichas «Todos / Ana / Luis» para ver el calendario de un profesional.
 *
 * Son enlaces normales (`?pro=<id>`, sin JavaScript) que conservan la
 * semana, como la navegación entre semanas. La página solo lo pinta con
 * más de un profesional activo.
 */
export function ProfessionalFilter({ team, selectedId, week }: ProfessionalFilterProps) {
  const t = useTranslations('providerPanel.calendar.filter');
  const options = buildProfessionalFilterOptions(team, selectedId, t('all'));

  return (
    <nav
      aria-label={t('region')}
      className={s.filter}
      data-component="calendar-professional-filter"
    >
      {options.map((option) => (
        <Link
          key={option.id ?? 'all'}
          href={calendarHref({ week, professionalId: option.id })}
          aria-current={option.active ? 'page' : undefined}
          className={`${s.filterChip} ${option.active ? s.filterChipActive : ''}`}
          data-component={`calendar-professional-filter-${option.id ?? 'all'}`}
        >
          {option.name}
        </Link>
      ))}
    </nav>
  );
}
