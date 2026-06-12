'use client';

import { ArrowLeft } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState, useTransition, type FormEvent } from 'react';

import { createServiceAction } from '@/app/[locale]/panel/servicios/nuevo/actions';
import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';
import type { AppLocale } from '@/i18n/routing';

import { useAddServiceForm } from './AddServiceForm.logic';
import { addServiceFormStyles as s } from './AddServiceForm.styles';
import type { AddServiceFormProps } from './AddServiceForm.types';

/**
 * Formulario de alta de servicio con cascada categoría → tipo → subtipo.
 *
 * Client Component porque mantiene estado local (draft), tiene varios
 * selects controlados y resetea hijos cuando cambia el padre. La
 * lógica vive en `useAddServiceForm`.
 *
 * El envío todavía no persiste nada (mock visual). Cuando exista API
 * real bastará con cambiar el handler `onSubmit` por una server action.
 */
export function AddServiceForm({ locale, categoriesTree }: AddServiceFormProps) {
  const t = useTranslations('providerPanel.addService');
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
  } = useAddServiceForm(categoriesTree);

  // Estado para feedback del submit. `isPending` activa loading del CTA
  // y `submitError` enseña un banner inline si la action devuelve `ok: false`.
  const [isPending, startTransition] = useTransition();
  const [submitError, setSubmitError] = useState<string | null>(null);

  /**
   * Disparador del alta real: empaqueta el draft y lo manda a la
   * server action `createServiceAction`. Si triunfa, la action hace
   * `redirect` server-side a `/panel/servicios` y este handler nunca
   * llega a ver `ok: true` (la promesa se aborta). Si falla, mostramos
   * el mensaje localizado tipo `errors.{code}`.
   */
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitError(null);
    startTransition(async () => {
      const result = await createServiceAction(locale as AppLocale, {
        rootCategoryId: draft.rootCategoryId,
        typeId: draft.typeId,
        subtypeId: draft.subtypeId,
        name: draft.name,
        description: draft.description,
        durationMinutes: draft.durationMinutes,
        priceEuros: draft.priceEuros,
      });
      if (result && !result.ok) {
        const key = `errors.${result.code}` as const;
        setSubmitError(result.message ?? t(key));
      }
    });
  }

  return (
    <form className={s.root} onSubmit={handleSubmit} data-component="add-service-form">
      <Link href="/panel/servicios" className={s.backLink} data-component="add-service-back-link">
        <ArrowLeft className="size-4" aria-hidden />
        {t('back')}
      </Link>

      <header>
        <h1 className={s.title}>{t('title')}</h1>
        <p className={s.subtitle}>{t('subtitle')}</p>
      </header>

      <section className={s.card} data-component="add-service-category-card">
        <header>
          <h2 className={s.cardTitle}>{t('categoryStep.title')}</h2>
          <p className={s.cardSubtitle}>{t('categoryStep.subtitle')}</p>
        </header>

        <div className={s.fieldGrid}>
          <div className={s.field}>
            <label className={s.label} htmlFor="add-service-root">
              {t('categoryStep.rootLabel')}
            </label>
            <select
              id="add-service-root"
              className={s.select}
              value={draft.rootCategoryId ?? ''}
              onChange={(e) => selectRoot(e.target.value)}
              data-component="add-service-select-root"
            >
              <option value="">{t('categoryStep.rootPlaceholder')}</option>
              {rootOptions.map((root) => (
                <option key={root.id} value={root.id}>
                  {root.name[locale]}
                </option>
              ))}
            </select>
          </div>

          <div className={s.field}>
            <label className={s.label} htmlFor="add-service-type">
              {t('categoryStep.typeLabel')}
            </label>
            <select
              id="add-service-type"
              className={s.select}
              value={draft.typeId ?? ''}
              onChange={(e) => selectType(e.target.value)}
              disabled={!draft.rootCategoryId}
              data-component="add-service-select-type"
            >
              <option value="">{t('categoryStep.typePlaceholder')}</option>
              {typeOptions.map((type) => (
                <option key={type.id} value={type.id}>
                  {type.name[locale]}
                </option>
              ))}
            </select>
            {!draft.rootCategoryId && (
              <span className={s.hint}>{t('categoryStep.hintAfterRoot')}</span>
            )}
          </div>

          <div className={s.field}>
            <label className={s.label} htmlFor="add-service-subtype">
              {t('categoryStep.subtypeLabel')}
            </label>
            <select
              id="add-service-subtype"
              className={s.select}
              value={draft.subtypeId ?? ''}
              onChange={(e) => selectSubtype(e.target.value)}
              disabled={!draft.typeId}
              data-component="add-service-select-subtype"
            >
              <option value="">{t('categoryStep.subtypePlaceholder')}</option>
              {subtypeOptions.map((subtype) => (
                <option key={subtype.id} value={subtype.id}>
                  {subtype.name[locale]}
                </option>
              ))}
            </select>
            {!draft.typeId && draft.rootCategoryId && (
              <span className={s.hint}>{t('categoryStep.hintAfterType')}</span>
            )}
          </div>
        </div>
      </section>

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
      </section>

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
          {isPending ? t('submitting') : t('submit')}
        </Button>
      </div>
    </form>
  );
}
