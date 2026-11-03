'use client';

import { ArrowRight } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Link } from '@/i18n/navigation';
import type { WeeklySchedule } from '@/lib/services/availability';

import { providerSettingsStyles as s } from './ProviderSettings.styles';
import { ScheduleEditor } from './ScheduleEditor';

interface ProviderScheduleCardProps {
  /** Horario del autónomo, o `null` si el negocio tiene equipo. */
  schedule: WeeklySchedule | null;
  onChange: (next: WeeklySchedule) => void;
  disabled: boolean;
}

/**
 * Tarjeta de horario de «Mi negocio».
 *
 * Con un solo profesional (autónomo) sigue siendo el editor de siempre:
 * no le obligamos a ir a otra pantalla. Con equipo, cada profesional
 * tiene su horario y aquí solo queda el enlace a `/panel/equipo`.
 */
export function ProviderScheduleCard({ schedule, onChange, disabled }: ProviderScheduleCardProps) {
  const t = useTranslations('providerPanel.settings');
  const tTeam = useTranslations('providerPanel.team.settingsLink');

  if (!schedule) {
    return (
      <article className={s.card} data-component="provider-settings-team-schedules">
        <header>
          <h2 className={s.cardTitle}>{t('schedule.title')}</h2>
          <p className={s.cardSubtitle}>{tTeam('description')}</p>
        </header>
        <Link href="/panel/equipo" className={s.teamLink} data-component="settings-team-link">
          {tTeam('cta')}
          <ArrowRight className="size-4" aria-hidden />
        </Link>
      </article>
    );
  }

  return (
    <article className={s.card} data-component="provider-settings-schedule">
      <header>
        <h2 className={s.cardTitle}>{t('schedule.title')}</h2>
        <p className={s.cardSubtitle}>{t('schedule.subtitle')}</p>
      </header>

      <ScheduleEditor value={schedule} onChange={onChange} disabled={disabled} />
    </article>
  );
}
