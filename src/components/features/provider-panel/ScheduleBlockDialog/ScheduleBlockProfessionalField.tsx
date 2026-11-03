'use client';

import { useTranslations } from 'next-intl';

import { ALL_TEAM } from './ScheduleBlockDialog.team';
import { scheduleBlockDialogStyles as s } from './ScheduleBlockDialog.styles';
import type { PanelTeamMember } from './ScheduleBlockDialog.types';

interface ScheduleBlockProfessionalFieldProps {
  id: string;
  team: PanelTeamMember[];
  /** Id del profesional, `ALL_TEAM` o vacío (sin elegir). */
  value: string;
  invalid: boolean;
  describedBy?: string;
  onChange: (value: string) => void;
}

/**
 * A quién se bloquea: un profesional del equipo o «Todo el equipo» (un
 * bloqueo por cada profesional activo). Solo se pinta con más de uno.
 *
 * `<select>` nativo: en móvil abre el selector del sistema, cómodo con
 * el pulgar y accesible sin más trabajo.
 */
export function ScheduleBlockProfessionalField({
  id,
  team,
  value,
  invalid,
  describedBy,
  onChange,
}: ScheduleBlockProfessionalFieldProps) {
  const t = useTranslations('providerPanel.calendar.scheduleBlocks.fields');

  return (
    <div className={s.field}>
      <label htmlFor={id} className={s.legend}>
        {t('professional')}
      </label>
      <select
        id={id}
        className={s.input}
        value={value}
        required
        aria-invalid={invalid ? true : undefined}
        aria-describedby={describedBy ? `${id}-hint ${describedBy}` : `${id}-hint`}
        onChange={(e) => onChange(e.target.value)}
        data-component="schedule-block-professional"
      >
        <option value="" disabled>
          {t('professionalPlaceholder')}
        </option>
        {team.map((member) => (
          <option key={member.id} value={member.id}>
            {member.name}
          </option>
        ))}
        <option value={ALL_TEAM}>{t('allTeam')}</option>
      </select>
      <p id={`${id}-hint`} className={s.hint}>
        {t('professionalHint')}
      </p>
    </div>
  );
}
