'use client';

import { useTranslations } from 'next-intl';

import { scheduleBlockDialogStyles as s } from './ScheduleBlockDialog.styles';
import type { ScheduleBlockConflictView } from './ScheduleBlockDialog.types';

interface ScheduleBlockConflictsProps {
  conflicts: ScheduleBlockConflictView[];
  /** Con equipo, cada cita dice de qué profesional es. */
  showProfessional?: boolean;
}

/**
 * Citas que impiden crear el bloqueo, en una lista legible («jue 6 nov
 * · 10:00 — Marta R. (Corte mujer)») y cómo resolverlo: cancelarlas
 * antes desde el calendario. Fechas y horas llegan ya formateadas. Con
 * equipo se añade el profesional («… · Ana»): con «Todo el equipo» las
 * citas pueden ser de varios.
 */
export function ScheduleBlockConflicts({
  conflicts,
  showProfessional = false,
}: ScheduleBlockConflictsProps) {
  const t = useTranslations('providerPanel.calendar.scheduleBlocks.errors');
  const tc = useTranslations('providerPanel.calendar');
  if (conflicts.length === 0) return null;

  const describe = (c: ScheduleBlockConflictView) => {
    const label = c.clientName
      ? t('conflictItem', {
          date: c.dateLabel,
          time: c.timeLabel,
          client: c.clientName,
          service: c.serviceName,
        })
      : t('conflictItemNoClient', {
          date: c.dateLabel,
          time: c.timeLabel,
          service: c.serviceName,
        });
    return showProfessional && c.professionalName
      ? tc('withProfessional', { label, professional: c.professionalName })
      : label;
  };

  return (
    <div className={s.conflicts} data-component="schedule-block-conflicts">
      <ul className={s.conflictList}>
        {conflicts.map((c) => (
          <li key={c.bookingId} data-component={`schedule-block-conflict-${c.bookingId}`}>
            {describe(c)}
          </li>
        ))}
      </ul>
      <p className={s.conflictHint}>{t('conflictHint')}</p>
    </div>
  );
}
