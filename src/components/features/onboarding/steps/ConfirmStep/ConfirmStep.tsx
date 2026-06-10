'use client';

import { useTranslations } from 'next-intl';
import { useId } from 'react';

import { localizedCategoryName } from '../CategoriesServiceStep/CategoriesServiceStep.logic';

import { confirmStepStyles as s } from './ConfirmStep.styles';
import type { ConfirmStepProps } from './ConfirmStep.types';

/**
 * Paso 5 del wizard — resumen read-only + aceptación de términos.
 *
 * Muestra los datos en bloques temáticos (negocio, ubicación, primer
 * servicio) y un checkbox de términos. La CTA real ("Publicar y entrar
 * al panel") vive en el footer del orquestador, que es quien dispara
 * las mutaciones.
 */
export function ConfirmStep(props: ConfirmStepProps) {
  const { summary, categories, locale, termsAccepted, onTermsChange } = props;
  const t = useTranslations('onboarding.confirm');
  const termsId = useId();

  // Helpers para pintar etiquetas localizadas a partir de IDs.
  const selectedCategory = categories.find((c) => c.id === summary.categoryId);
  const categoryLabel = selectedCategory
    ? localizedCategoryName(selectedCategory, locale)
    : summary.categoryId;

  // Formato de precio en euros con dos decimales y símbolo €. Usamos
  // Intl para respetar la separación numérica del locale activo.
  const priceFormatter = new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 2,
  });

  return (
    <section className={s.root} aria-labelledby="onboarding-confirm-title">
      <header className={s.header}>
        <h2 id="onboarding-confirm-title" className={s.title}>
          {t('title')}
        </h2>
        <p className={s.subtitle}>{t('subtitle')}</p>
      </header>

      <div className={s.sections}>
        {/* Bloque negocio */}
        <div className={s.section}>
          <span className={s.sectionHeading}>{t('sections.business')}</span>
          <div className={s.row}>
            <span className={s.rowLabel}>{summary.businessName}</span>
          </div>
          <div className={s.row}>
            <span className={s.rowLabel}>yaiwell.com/centro/</span>
            <span className={s.rowValue}>{summary.slug}</span>
          </div>
          {summary.vatNumber ? (
            <div className={s.row}>
              <span className={s.rowLabel}>VAT</span>
              <span className={s.rowValue}>{summary.vatNumber}</span>
            </div>
          ) : null}
          <div className={s.row}>
            <span className={s.rowValue}>{summary.description}</span>
          </div>
          <div className={s.row}>
            <span className={s.rowValue}>{summary.priceRange}</span>
          </div>
        </div>

        {/* Bloque ubicación */}
        <div className={s.section}>
          <span className={s.sectionHeading}>{t('sections.location')}</span>
          <div className={s.row}>
            <span className={s.rowValue}>{summary.address}</span>
          </div>
        </div>

        {/* Bloque primer servicio */}
        <div className={s.section}>
          <span className={s.sectionHeading}>{t('sections.service')}</span>
          <div className={s.row}>
            <span className={s.rowLabel}>{categoryLabel}</span>
            <span className={s.rowValue}>{summary.serviceName}</span>
          </div>
          <div className={s.row}>
            <span className={s.rowLabel}>{summary.serviceDurationMinutes} min</span>
            <span className={s.rowValue}>{priceFormatter.format(summary.servicePriceEuros)}</span>
          </div>
        </div>
      </div>

      <div className={s.termsRow}>
        <input
          id={termsId}
          type="checkbox"
          className={s.termsBox}
          checked={termsAccepted}
          onChange={(e) => onTermsChange(e.target.checked)}
        />
        <label htmlFor={termsId} className={s.termsLabel}>
          {t('termsLabel')}
        </label>
      </div>
    </section>
  );
}
