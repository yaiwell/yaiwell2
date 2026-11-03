'use client';

import { CheckCircle2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Dialog } from 'radix-ui';
import { useId } from 'react';

import { Button } from '@/components/ui/button';

import { bookingActionDialogStyles as d } from '../BookingActionsList/BookingActionsList.styles';
import { ScheduleBlockConflicts } from './ScheduleBlockConflicts';
import { ScheduleBlockProfessionalField } from './ScheduleBlockProfessionalField';
import {
  SCHEDULE_BLOCK_REASON_MAX,
  TIME_INPUT_STEP_SECONDS,
  useScheduleBlockForm,
} from './ScheduleBlockDialog.logic';
import { scheduleBlockDialogStyles as s } from './ScheduleBlockDialog.styles';
import type { ScheduleBlockFormProps } from './ScheduleBlockDialog.types';

/**
 * Contenido del diálogo: rango (fecha + hora de inicio y de fin),
 * motivo privado con contador, validación en vivo y envío. Si el
 * servidor encuentra citas en el rango, las lista: hay que cancelarlas
 * antes desde el propio calendario. Tras crear, confirma en el sitio.
 *
 * Con equipo, primero se elige a quién se bloquea (o a todo el equipo).
 */
export function ScheduleBlockForm({
  locale,
  now,
  team,
  defaultProfessionalId,
  onClose,
}: ScheduleBlockFormProps) {
  const t = useTranslations('providerPanel.calendar.scheduleBlocks');
  const id = useId();
  const form = useScheduleBlockForm(locale, now, team, defaultProfessionalId);
  const { values, setField, issue, errorKey, conflicts, done, isPending, submit } = form;
  const issueId = `${id}-issue`;

  if (done) {
    return (
      <div className={s.success} data-component="schedule-block-success">
        <CheckCircle2 className={s.successIcon} aria-hidden />
        <Dialog.Title className={d.title}>{t('created.title')}</Dialog.Title>
        <Dialog.Description className={d.description}>
          {t('created.description')}
        </Dialog.Description>
        <div className={d.actions}>
          <Button type="button" size="sm" onClick={onClose}>
            {t('close')}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form
      className={s.form}
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
      data-component="schedule-block-form"
    >
      <div className={s.header}>
        <Dialog.Title className={d.title}>{t('dialog.title')}</Dialog.Title>
        <Dialog.Description className={d.description}>{t('dialog.description')}</Dialog.Description>
      </div>

      {form.hasTeam && (
        <ScheduleBlockProfessionalField
          id={`${id}-professional`}
          team={team}
          value={form.target}
          invalid={issue === 'professional'}
          describedBy={issue === 'professional' ? issueId : undefined}
          onChange={form.setTarget}
        />
      )}

      {(['start', 'end'] as const).map((edge) => {
        const dateField = edge === 'start' ? 'startDateKey' : 'endDateKey';
        const timeField = edge === 'start' ? 'startTime' : 'endTime';
        return (
          <fieldset key={edge} className={s.fieldset}>
            <legend className={s.legend}>{t(`fields.${edge}`)}</legend>
            <div className={s.row}>
              <div className={s.field}>
                <label htmlFor={`${id}-${dateField}`} className={s.label}>
                  {t('fields.date')}
                </label>
                <input
                  id={`${id}-${dateField}`}
                  type="date"
                  required
                  className={s.input}
                  value={values[dateField]}
                  aria-describedby={issue ? issueId : undefined}
                  onChange={(e) => setField(dateField, e.target.value)}
                  data-component={`schedule-block-${edge}-date`}
                />
              </div>
              <div className={s.field}>
                <label htmlFor={`${id}-${timeField}`} className={s.label}>
                  {t('fields.time')}
                </label>
                <input
                  id={`${id}-${timeField}`}
                  type="time"
                  required
                  step={TIME_INPUT_STEP_SECONDS}
                  className={s.input}
                  value={values[timeField]}
                  aria-invalid={issue === 'endBeforeStart' && edge === 'end' ? true : undefined}
                  aria-describedby={issue ? issueId : undefined}
                  onChange={(e) => setField(timeField, e.target.value)}
                  data-component={`schedule-block-${edge}-time`}
                />
              </div>
            </div>
          </fieldset>
        );
      })}

      <div className={s.field}>
        <label htmlFor={`${id}-reason`} className={s.legend}>
          {t('fields.reason')}
        </label>
        <textarea
          id={`${id}-reason`}
          className={s.textarea}
          maxLength={SCHEDULE_BLOCK_REASON_MAX}
          value={values.reason}
          placeholder={t('fields.reasonPlaceholder')}
          aria-describedby={`${id}-reason-hint`}
          onChange={(e) => setField('reason', e.target.value)}
          data-component="schedule-block-reason"
        />
        <div className={s.reasonMeta}>
          <p id={`${id}-reason-hint`} className={s.hint}>
            {t('fields.reasonHint')}
          </p>
          <span className={s.counter} aria-hidden>
            {t('fields.reasonCounter', {
              count: values.reason.length,
              max: SCHEDULE_BLOCK_REASON_MAX,
            })}
          </span>
        </div>
      </div>

      {issue && (
        <p id={issueId} className={s.issue} role="status" data-component="schedule-block-issue">
          {t(`issues.${issue}`)}
        </p>
      )}

      {errorKey && (
        <div role="alert" className={d.errorBanner} data-component="schedule-block-error">
          {t(`errors.${errorKey}`)}
          {errorKey === 'conflict' && (
            <ScheduleBlockConflicts conflicts={conflicts} showProfessional={form.hasTeam} />
          )}
        </div>
      )}

      <div className={d.actions}>
        <Button type="button" variant="outline" size="sm" disabled={isPending} onClick={onClose}>
          {t('cancel')}
        </Button>
        <Button
          type="submit"
          size="sm"
          disabled={isPending || issue !== null}
          data-component="schedule-block-submit"
        >
          {isPending ? t('submitting') : t('submit')}
        </Button>
      </div>
    </form>
  );
}
