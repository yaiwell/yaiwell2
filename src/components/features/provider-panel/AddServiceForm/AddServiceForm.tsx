'use client';

import { ArrowLeft } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';
import type { AppLocale } from '@/i18n/routing';

import { PlanLimitNotice } from '../PlanLimitNotice';

import {
  useAddServiceForm,
  useAddServiceSubmit,
  useTranslateServiceError,
} from './AddServiceForm.logic';
import { addServiceFormStyles as s } from './AddServiceForm.styles';
import { useServiceProfessionals } from './AddServiceForm.team';
import type { AddServiceFormProps } from './AddServiceForm.types';
import { ServiceCategoryFields } from './ServiceCategoryFields';
import { ServiceProfessionalsField } from './ServiceProfessionalsField';

/**
 * Formulario de alta de servicio con cascada categoría → tipo → subtipo.
 *
 * Client Component porque mantiene estado local (draft), tiene varios
 * selects controlados y resetea hijos cuando cambia el padre. La
 * lógica vive en `useAddServiceForm`.
 *
 * El envío lo gestiona `useAddServiceSubmit` (server actions de alta y
 * edición). Si el plan no admite más servicios, en lugar del error de
 * texto se muestra el aviso con enlace a mejorar el plan.
 */
export function AddServiceForm({
  locale,
  categoriesTree,
  serviceId,
  initialValues,
  planLimitReached: initialPlanLimitReached,
  professionals = [],
  initialProfessionalIds,
}: AddServiceFormProps) {
  const t = useTranslations('providerPanel.addService');
  const translateError = useTranslateServiceError();
  const team = useServiceProfessionals(professionals, initialProfessionalIds);
  const {
    draft,
    rootOptions,
    typeOptions,
    subtypeOptions,
    selectRoot,
    selectType,
    selectSubtype,
    updateField,
    reset,
  } = useAddServiceForm(categoriesTree, initialValues);

  // `serviceId` presente → modo edición. Cambia la action y los copy
  // del título y CTA (todos vienen del namespace `addService` para no
  // duplicar; los específicos de edit tienen prefijo `edit*`).
  const isEditing = Boolean(serviceId);

  const { isPending, submitError, planLimitReached, handleSubmit } = useAddServiceSubmit({
    locale: locale as AppLocale,
    serviceId,
    draft,
    translateError,
    initialPlanLimitReached,
    professionalIds: team.professionalIds,
    professionalsEmptyMessage: team.emptyMessage,
  });

  return (
    <form className={s.root} onSubmit={handleSubmit} data-component="add-service-form">
      <Link href="/panel/servicios" className={s.backLink} data-component="add-service-back-link">
        <ArrowLeft className="size-4" aria-hidden />
        {t('back')}
      </Link>

      <header>
        <h1 className={s.title}>{isEditing ? t('editTitle') : t('title')}</h1>
        <p className={s.subtitle}>{isEditing ? t('editSubtitle') : t('subtitle')}</p>
      </header>

      <ServiceCategoryFields
        locale={locale}
        draft={draft}
        rootOptions={rootOptions}
        typeOptions={typeOptions}
        subtypeOptions={subtypeOptions}
        onSelectRoot={selectRoot}
        onSelectType={selectType}
        onSelectSubtype={selectSubtype}
      />

      <section className={s.card} data-component="add-service-details-card">
        <header>
          <h2 className={s.cardTitle}>{t('detailsStep.title')}</h2>
          <p className={s.cardSubtitle}>{t('detailsStep.subtitle')}</p>
        </header>

        <div className={s.field}>
          <label className={s.label} htmlFor="add-service-name">
            {t('detailsStep.nameLabel')}
          </label>
          <input
            id="add-service-name"
            type="text"
            className={s.input}
            value={draft.name}
            placeholder={t('detailsStep.namePlaceholder')}
            onChange={(e) => updateField('name', e.target.value)}
            data-component="add-service-input-name"
          />
        </div>

        <div className={s.field}>
          <label className={s.label} htmlFor="add-service-description">
            {t('detailsStep.descriptionLabel')}
          </label>
          <textarea
            id="add-service-description"
            className={s.textarea}
            value={draft.description}
            placeholder={t('detailsStep.descriptionPlaceholder')}
            onChange={(e) => updateField('description', e.target.value)}
            data-component="add-service-input-description"
          />
        </div>

        <div className={s.fieldGrid}>
          <div className={s.field}>
            <label className={s.label} htmlFor="add-service-duration">
              {t('detailsStep.durationLabel')}
            </label>
            <input
              id="add-service-duration"
              type="number"
              min={5}
              step={5}
              className={s.input}
              value={draft.durationMinutes}
              onChange={(e) => updateField('durationMinutes', e.target.value)}
              data-component="add-service-input-duration"
            />
          </div>

          <div className={s.field}>
            <label className={s.label} htmlFor="add-service-price">
              {t('detailsStep.priceLabel')}
            </label>
            <input
              id="add-service-price"
              type="number"
              min={0}
              step={0.5}
              className={s.input}
              value={draft.priceEuros}
              onChange={(e) => updateField('priceEuros', e.target.value)}
              data-component="add-service-input-price"
            />
          </div>
        </div>

        {team.enabled ? (
          <ServiceProfessionalsField
            options={professionals}
            selected={team.selected}
            onToggle={team.toggle}
            disabled={isPending}
          />
        ) : null}
      </section>

      {planLimitReached ? <PlanLimitNotice /> : null}

      {submitError ? (
        <p className={s.notice} role="alert" data-component="add-service-error">
          {submitError}
        </p>
      ) : null}

      <div className={s.actions}>
        <Button
          type="button"
          variant="ghost"
          onClick={reset}
          disabled={isPending}
          data-component="add-service-cancel"
        >
          {t('cancel')}
        </Button>
        <Button type="submit" size="lg" disabled={isPending} data-component="add-service-submit">
          {isPending
            ? isEditing
              ? t('updating')
              : t('submitting')
            : isEditing
              ? t('editSubmit')
              : t('submit')}
        </Button>
      </div>
    </form>
  );
}
