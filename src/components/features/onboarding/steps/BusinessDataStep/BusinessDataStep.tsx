'use client';

import { useTranslations } from 'next-intl';
import { useId } from 'react';

import { cn } from '@/lib/utils';

import type { PriceRangeChoice } from '../../shared';

import { useBusinessDataStep } from './BusinessDataStep.logic';
import { businessDataStepStyles as s } from './BusinessDataStep.styles';
import type { BusinessDataStepProps } from './BusinessDataStep.types';

/** Tope de caracteres de la descripción pública del centro. */
const DESCRIPTION_MAX = 280;

/**
 * Paso 2 del wizard — datos del negocio.
 *
 * Pinta los campos: nombre, slug con feedback de disponibilidad, VAT
 * opcional, descripción con contador y selector de rango de precio.
 * La lógica (debounce + comprobación de slug) vive en `useBusinessDataStep`.
 */
export function BusinessDataStep(props: BusinessDataStepProps) {
  const { value, onChange, slugStatus, onSlugStatusChange, externalError } = props;
  const t = useTranslations('onboarding.businessData');
  const tCommon = useTranslations('onboarding.common');

  const ids = {
    name: useId(),
    slug: useId(),
    vat: useId(),
    description: useId(),
    price: useId(),
    slugHelper: useId(),
  };

  const { handleBusinessNameBlur, handleSlugChange } = useBusinessDataStep({
    businessName: value.businessName,
    slug: value.slug,
    slugStatus,
    onSlugChange: (slug) => onChange({ slug }),
    onSlugStatusChange,
  });

  const descriptionLength = value.description.length;
  const isDescriptionAtMax = descriptionLength >= DESCRIPTION_MAX;

  // Texto del helper visual del slug según estado.
  const slugHelperText = (() => {
    if (externalError) return externalError;
    switch (slugStatus) {
      case 'checking':
        return t('fields.slugChecking');
      case 'available':
        return t('fields.slugAvailable');
      case 'taken':
        return t('fields.slugTaken');
      case 'invalid':
        return t('fields.slugInvalid');
      default:
        return t('fields.slugHelp');
    }
  })();

  const slugHelperClass = (() => {
    if (externalError) return s.helperTaken;
    switch (slugStatus) {
      case 'checking':
        return s.helperChecking;
      case 'available':
        return s.helperAvailable;
      case 'taken':
      case 'invalid':
        return s.helperTaken;
      default:
        return s.helper;
    }
  })();

  const isSlugInvalid =
    slugStatus === 'invalid' || slugStatus === 'taken' || Boolean(externalError);

  const priceOptions: PriceRangeChoice[] = ['€', '€€', '€€€'];

  return (
    <section className={s.root} aria-labelledby="onboarding-business-data-title">
      <header className={s.header}>
        <h2 id="onboarding-business-data-title" className={s.title}>
          {t('title')}
        </h2>
        <p className={s.subtitle}>{t('subtitle')}</p>
      </header>

      <div className={s.form}>
        {/* Nombre del negocio */}
        <div className={s.field}>
          <label htmlFor={ids.name} className={s.label}>
            {t('fields.businessName')}
          </label>
          <input
            id={ids.name}
            type="text"
            className={s.input}
            placeholder={t('fields.businessNamePlaceholder')}
            value={value.businessName}
            onChange={(e) => onChange({ businessName: e.target.value })}
            onBlur={handleBusinessNameBlur}
            maxLength={120}
            required
          />
        </div>

        {/* Slug */}
        <div className={s.field}>
          <label htmlFor={ids.slug} className={s.label}>
            {t('fields.slug')}
          </label>
          <div className={cn(s.slugRow, isSlugInvalid && s.slugRowInvalid)}>
            <span className={s.slugPrefix}>{t('fields.slugPrefix')}</span>
            <input
              id={ids.slug}
              type="text"
              className={s.slugInput}
              value={value.slug}
              onChange={(e) => handleSlugChange(e.target.value)}
              minLength={3}
              maxLength={60}
              aria-describedby={ids.slugHelper}
              aria-invalid={isSlugInvalid}
            />
          </div>
          <span id={ids.slugHelper} className={slugHelperClass}>
            {slugHelperText}
          </span>
        </div>

        {/* VAT */}
        <div className={s.field}>
          <label htmlFor={ids.vat} className={s.label}>
            {t('fields.vatNumber')}
          </label>
          <input
            id={ids.vat}
            type="text"
            className={s.input}
            value={value.vatNumber}
            onChange={(e) => onChange({ vatNumber: e.target.value.toUpperCase() })}
            maxLength={12}
            autoComplete="off"
          />
          <span className={s.helper}>{t('fields.vatNumberHelp')}</span>
        </div>

        {/* Descripción pública */}
        <div className={s.field}>
          <label htmlFor={ids.description} className={s.label}>
            {t('fields.description')}
          </label>
          <textarea
            id={ids.description}
            className={s.textarea}
            value={value.description}
            onChange={(e) => onChange({ description: e.target.value.slice(0, DESCRIPTION_MAX) })}
            maxLength={DESCRIPTION_MAX}
            required
            aria-invalid={isDescriptionAtMax ? undefined : undefined}
          />
          <span className={s.charCount}>
            {t('fields.descriptionCharCount', { count: descriptionLength, max: DESCRIPTION_MAX })}
          </span>
          <span className={s.helper}>{t('fields.descriptionHelp')}</span>
        </div>

        {/* Rango de precio */}
        <div className={s.field}>
          <span id={ids.price} className={s.label}>
            {t('fields.priceRange')}
          </span>
          <div className={s.priceGroup} role="radiogroup" aria-labelledby={ids.price}>
            {priceOptions.map((option) => {
              const isSelected = value.priceRange === option;
              return (
                <button
                  key={option}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  className={cn(s.priceChip, isSelected && s.priceChipSelected)}
                  onClick={() => onChange({ priceRange: option })}
                >
                  {option}
                </button>
              );
            })}
          </div>
          <span className={s.helper}>{t('fields.priceRangeHelp')}</span>
        </div>

        {/* Mensaje de campo requerido (fallback genérico) */}
        {!value.priceRange && value.businessName.length > 0 && (
          <span className={s.helper}>{tCommon('requiredField')}</span>
        )}
      </div>
    </section>
  );
}
