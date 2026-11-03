'use client';

import { useTranslations } from 'next-intl';

import { scheduleBlockDialogStyles as s } from './ScheduleBlockDialog.styles';
import type { ScheduleBlockConflictView } from './ScheduleBlockDialog.types';

interface ScheduleBlockConflictsProps {
  conflicts: ScheduleBlockConflictView[];
}

/**
 * Citas que impiden crear el bloqueo, en una lista legible («jue 6 nov
 * · 10:00 — Marta R. (Corte mujer)») y cómo resolverlo: cancelarlas
 * antes desde el calendario. Fechas y horas llegan ya formateadas.
 */
export function ScheduleBlockConflicts({ conflicts }: ScheduleBlockConflictsProps) {
  const t = useTranslations('providerPanel.calendar.scheduleBlocks.errors');
  if (conflicts.length === 0) return null;

  return (
    <div className={s.conflicts} data-component="schedule-block-conflicts">
      <ul className={s.conflictList}>
        {conflicts.map((c) => (
          <li key={c.bookingId} data-component={`schedule-block-conflict-${c.bookingId}`}>
            {c.clientName
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
                })}
          </li>
        ))}
      </ul>
      <p className={s.conflictHint}>{t('conflictHint')}</p>
    </div>
  );
}
