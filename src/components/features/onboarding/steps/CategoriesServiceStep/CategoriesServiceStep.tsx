'use client';

import { useTranslations } from 'next-intl';
import { useId } from 'react';

import { cn } from '@/lib/utils';

import {
  DURATION_OPTIONS,
  localizedCategoryName,
  useCategoriesServiceStep,
} from './CategoriesServiceStep.logic';
import { categoriesServiceStepStyles as s } from './CategoriesServiceStep.styles';
import type { CategoriesServiceStepProps } from './CategoriesServiceStep.types';

/**
 * Paso 4 del wizard — categoría raíz + primer servicio.
 *
 * El usuario elige una de las categorías raíz pre-cargadas y rellena
 * los datos del primer servicio (nombre, descripción opcional,
 * duración, precio). La descripción es opcional para no bloquear al
 * proveedor en el alta — la podrá editar más tarde desde el panel.
 */
export function CategoriesServiceStep(props: CategoriesServiceStepProps) {
  const { value, onChange, categories, locale } = props;
  const t = useTranslations('onboarding.categoriesService');

  const ids = {
    categories: useId(),
    name: useId(),
    duration: useId(),
    price: useId(),
  };

  const { handlePriceChange, handleDurationChange } = useCategoriesServiceStep({ onChange });

  return (
    <section className={s.root} aria-labelledby="onboarding-categories-title">
      <header className={s.header}>
        <h2 id="onboarding-categories-title" className={s.title}>
          {t('title')}
        </h2>
        <p className={s.subtitle}>{t('subtitle')}</p>
      </header>

      {/* Selector de categoría raíz. */}
      <div className={s.block}>
        <span id={ids.categories} className={s.label}>
          {t('categoriesLabel')}
        </span>
        <div className={s.categoryGrid} role="radiogroup" aria-labelledby={ids.categories}>
          {categories.map((category) => {
            const isSelected = value.categoryId === category.id;
            return (
              <button
                key={category.id}
                type="button"
                role="radio"
                aria-checked={isSelected}
                className={cn(s.categoryCard, isSelected && s.categoryCardSelected)}
                onClick={() => onChange({ categoryId: category.id })}
              >
                <span>{localizedCategoryName(category, locale)}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Bloque del primer servicio. */}
      <div className={s.serviceBlock}>
        <span className={s.serviceBlockHeading}>{t('service.title')}</span>

        <div className={s.field}>
          <label htmlFor={ids.name} className={s.label}>
            {t('service.name')}
          </label>
          <input
            id={ids.name}
            type="text"
            className={s.input}
            placeholder={t('service.namePlaceholder')}
            value={value.serviceName}
            onChange={(e) => onChange({ serviceName: e.target.value })}
            maxLength={120}
            required
          />
        </div>

        <div className={s.twoCols}>
          <div className={s.field}>
            <span id={ids.duration} className={s.label}>
              {t('service.duration')}
            </span>
            <div className={s.durationChips} role="radiogroup" aria-labelledby={ids.duration}>
              {DURATION_OPTIONS.map((minutes) => {
                const isSelected = value.serviceDurationMinutes === minutes;
                return (
                  <button
                    key={minutes}
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    className={cn(s.durationChip, isSelected && s.durationChipSelected)}
                    onClick={() => handleDurationChange(minutes)}
                  >
                    {t('service.durationMinutes', { minutes })}
                  </button>
                );
              })}
            </div>
          </div>

          <div className={s.field}>
            <label htmlFor={ids.price} className={s.label}>
              {t('service.priceEuros')}
            </label>
            <input
              id={ids.price}
              type="text"
              inputMode="decimal"
              className={s.input}
              value={value.servicePriceEuros === 0 ? '' : String(value.servicePriceEuros)}
              onChange={(e) => handlePriceChange(e.target.value)}
              placeholder="0"
            />
            <span className={s.helper}>{t('service.priceFreeHint')}</span>
          </div>
        </div>
      </div>
    </section>
  );
}
