'use client';

import { useTranslations } from 'next-intl';

import { pickLocalized } from '@/lib/i18n';

import { addServiceFormStyles as s } from './AddServiceForm.styles';
import type {
  AddServiceDraft,
  CategoryRoot,
  CategorySubtype,
  CategoryType,
  SupportedLocale,
} from './AddServiceForm.types';

interface ServiceCategoryFieldsProps {
  locale: SupportedLocale;
  draft: AddServiceDraft;
  rootOptions: readonly CategoryRoot[];
  typeOptions: readonly CategoryType[];
  subtypeOptions: readonly CategorySubtype[];
  onSelectRoot: (id: string) => void;
  onSelectType: (id: string) => void;
  onSelectSubtype: (id: string) => void;
}

/**
 * Tarjeta de la cascada categoría → tipo → subtipo del formulario de
 * servicio. Presentacional: el estado y el reseteo de los niveles
 * inferiores viven en `useAddServiceForm`.
 */
export function ServiceCategoryFields({
  locale,
  draft,
  rootOptions,
  typeOptions,
  subtypeOptions,
  onSelectRoot,
  onSelectType,
  onSelectSubtype,
}: ServiceCategoryFieldsProps) {
  const t = useTranslations('providerPanel.addService');

  return (
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
            onChange={(e) => onSelectRoot(e.target.value)}
            data-component="add-service-select-root"
          >
            <option value="">{t('categoryStep.rootPlaceholder')}</option>
            {rootOptions.map((root) => (
              <option key={root.id} value={root.id}>
                {pickLocalized(root.name, locale)}
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
            onChange={(e) => onSelectType(e.target.value)}
            disabled={!draft.rootCategoryId}
            data-component="add-service-select-type"
          >
            <option value="">{t('categoryStep.typePlaceholder')}</option>
            {typeOptions.map((type) => (
              <option key={type.id} value={type.id}>
                {pickLocalized(type.name, locale)}
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
            onChange={(e) => onSelectSubtype(e.target.value)}
            disabled={!draft.typeId}
            data-component="add-service-select-subtype"
          >
            <option value="">{t('categoryStep.subtypePlaceholder')}</option>
            {subtypeOptions.map((subtype) => (
              <option key={subtype.id} value={subtype.id}>
                {pickLocalized(subtype.name, locale)}
              </option>
            ))}
          </select>
          {!draft.typeId && draft.rootCategoryId && (
            <span className={s.hint}>{t('categoryStep.hintAfterType')}</span>
          )}
        </div>
      </div>
    </section>
  );
}
