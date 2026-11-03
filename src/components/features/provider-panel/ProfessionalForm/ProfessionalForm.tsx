'use client';

import { ArrowLeft } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { ScheduleEditor } from '@/components/features/provider-panel/ProviderSettings/ScheduleEditor';
import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';
import type { AppLocale } from '@/i18n/routing';
import { pickLocalized } from '@/lib/i18n/pickLocalized';

import { DeactivateProfessionalDialog } from './DeactivateProfessionalDialog';
import { useProfessionalForm, useProfessionalLifecycle } from './ProfessionalForm.logic';
import { professionalFormStyles as s } from './ProfessionalForm.styles';
import type { ProfessionalFormProps, ProfessionalNotice } from './ProfessionalForm.types';
import { ProfessionalProfileFields } from './ProfessionalProfileFields';

/** Aviso de error con la lista de servicios afectados, si la hay. */
function ErrorNotice({
  notice,
  locale,
}: {
  notice: ProfessionalNotice | null;
  locale: ProfessionalFormProps['locale'];
}) {
  const t = useTranslations('providerPanel.team');
  if (notice?.kind !== 'error') return null;
  return (
    <div role="alert" className={s.errorNotice} data-component="professional-error">
      <p>{t(`errors.${notice.code}`)}</p>
      {notice.services?.length ? (
        <ul className={s.errorList}>
          {notice.services.map((service) => (
            <li key={service.id}>{pickLocalized(service.name, locale)}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

/**
 * Alta y edición de un profesional del equipo: perfil, horario propio y
 * servicios que presta. En edición añade la baja (con las citas que la
 * impiden) o, si está de baja, la reactivación.
 */
export function ProfessionalForm({
  locale,
  providerId,
  services,
  professional,
  defaultSchedule,
  blockingBookings = [],
}: ProfessionalFormProps) {
  const t = useTranslations('providerPanel.team');
  const appLocale = locale as AppLocale;
  const form = useProfessionalForm(
    appLocale,
    {
      name: professional?.name ?? '',
      bio: professional?.bio ?? '',
      photo: professional?.photo ?? null,
      schedule: professional?.schedule ?? defaultSchedule,
      serviceIds: professional?.serviceIds ?? [],
    },
    professional?.id,
  );
  const lifecycle = useProfessionalLifecycle(appLocale, professional, blockingBookings);
  const isInactive = professional?.status === 'inactive';
  const busy = form.isPending || lifecycle.isPending;

  return (
    <form className={s.root} onSubmit={form.handleSubmit} data-component="professional-form">
      <Link href="/panel/equipo" className={s.backLink}>
        <ArrowLeft className="size-4" aria-hidden />
        {t('form.back')}
      </Link>

      <header className={s.header}>
        <h1 className={s.title}>{professional ? professional.name : t('form.newTitle')}</h1>
        <p className={s.subtitle}>{professional ? t('form.editTitle') : t('form.newSubtitle')}</p>
      </header>

      {isInactive ? <p className={s.infoNotice}>{t('form.inactiveNotice')}</p> : null}
      {professional?.status === 'outOfPlan' ? (
        <p className={s.infoNotice}>{t('form.outOfPlanNotice')}</p>
      ) : null}

      {/* De baja no se edita: primero se reactiva. */}
      <fieldset disabled={isInactive || busy} className={s.fieldset}>
        <ProfessionalProfileFields
          providerId={providerId}
          draft={form.draft}
          initialPhoto={professional?.photo ?? null}
          onChange={form.updateField}
        />

        <section className={s.card} data-component="professional-schedule">
          <header>
            <h2 className={s.cardTitle}>{t('form.scheduleTitle')}</h2>
            <p className={s.cardSubtitle}>{t('form.scheduleSubtitle')}</p>
          </header>
          <ScheduleEditor
            value={form.draft.schedule}
            onChange={(next) => form.updateField('schedule', next)}
            disabled={isInactive || busy}
          />
        </section>

        <section className={s.card} data-component="professional-services">
          <header>
            <h2 className={s.cardTitle}>{t('form.servicesTitle')}</h2>
            <p className={s.cardSubtitle}>{t('form.servicesSubtitle')}</p>
          </header>
          {services.length === 0 ? (
            <p className={s.hint}>{t('form.servicesEmpty')}</p>
          ) : (
            <div className={s.servicesList}>
              {services.map((service) => (
                <label key={service.id} className={s.serviceOption}>
                  <input
                    type="checkbox"
                    className={s.checkbox}
                    checked={form.draft.serviceIds.includes(service.id)}
                    onChange={() => form.toggleService(service.id)}
                    data-component="professional-service"
                  />
                  {pickLocalized(service.name, locale)}
                </label>
              ))}
            </div>
          )}
        </section>
      </fieldset>

      {form.notice?.kind === 'saved' ? (
        <p role="status" className={s.successNotice}>
          {t('form.saved')}
        </p>
      ) : null}
      <ErrorNotice notice={form.notice} locale={locale} />
      {/* Errores de reactivar (los de la baja salen dentro del diálogo). */}
      {isInactive ? <ErrorNotice notice={lifecycle.notice} locale={locale} /> : null}

      <div className={s.actions}>
        <div>
          {professional && !isInactive ? (
            <DeactivateProfessionalDialog
              locale={locale}
              name={professional.name}
              bookings={lifecycle.bookings}
              notice={lifecycle.notice}
              open={lifecycle.dialogOpen}
              onOpenChange={lifecycle.onDialogOpenChange}
              onConfirm={lifecycle.deactivate}
              isPending={lifecycle.isPending}
            />
          ) : null}
        </div>
        <div className={s.primaryActions}>
          {isInactive ? (
            <Button
              type="button"
              size="lg"
              disabled={busy}
              onClick={lifecycle.reactivate}
              data-component="professional-reactivate"
            >
              {lifecycle.isPending ? t('reactivate.pending') : t('reactivate.button')}
            </Button>
          ) : (
            <Button type="submit" size="lg" disabled={busy} data-component="professional-submit">
              {form.isPending
                ? t('form.saving')
                : professional
                  ? t('form.submitSave')
                  : t('form.submitCreate')}
            </Button>
          )}
        </div>
      </div>
    </form>
  );
}
