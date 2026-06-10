'use client';

import { useTranslations } from 'next-intl';

import { AddressAutocomplete } from '@/components/shared/AddressAutocomplete';

import { locationStepStyles as s } from './LocationStep.styles';
import type { LocationStepProps } from './LocationStep.types';

/**
 * Paso 3 del wizard — selección de la dirección física.
 *
 * Apoyado en el componente compartido `AddressAutocomplete`. La
 * dirección se fija al confirmar una sugerencia del listbox: si el
 * usuario escribe pero no elige nada, las coordenadas siguen siendo
 * `undefined` y el orquestador bloquea el botón "Siguiente".
 */
export function LocationStep({ value, onChange, locale }: LocationStepProps) {
  const t = useTranslations('onboarding.location');

  // Pista visible mientras no hayan coordenadas seleccionadas (lat/lng).
  const hasCoordinates = value.lat !== undefined && value.lng !== undefined;

  return (
    <section className={s.root} aria-labelledby="onboarding-location-title">
      <header className={s.header}>
        <h2 id="onboarding-location-title" className={s.title}>
          {t('title')}
        </h2>
        <p className={s.subtitle}>{t('subtitle')}</p>
      </header>

      <div className={s.field}>
        <AddressAutocomplete
          label={t('addressLabel')}
          locale={locale}
          country="es"
          initialValue={value.address}
          onSelect={(selection) =>
            onChange({
              address: selection.fullAddress,
              lat: selection.lat,
              lng: selection.lng,
            })
          }
          onClear={() => onChange({ address: '', lat: undefined, lng: undefined })}
        />
        {!hasCoordinates && value.address.length > 0 && (
          <span className={s.warning} role="status">
            {t('locationMissing')}
          </span>
        )}
      </div>

      <p className={s.hintPanel}>{t('mapHint')}</p>
    </section>
  );
}
