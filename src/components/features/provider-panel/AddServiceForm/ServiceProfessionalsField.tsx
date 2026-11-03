'use client';

import { useTranslations } from 'next-intl';

import { addServiceFormStyles as s } from './AddServiceForm.styles';
import type { ServiceProfessionalOption } from './AddServiceForm.types';

interface ServiceProfessionalsFieldProps {
  options: readonly ServiceProfessionalOption[];
  selected: readonly string[];
  onToggle: (id: string) => void;
  disabled?: boolean;
}

/**
 * Casillas «Quién lo presta» del formulario de servicio. Solo se pinta
 * con dos o más profesionales activos (lo decide el padre).
 */
export function ServiceProfessionalsField({
  options,
  selected,
  onToggle,
  disabled,
}: ServiceProfessionalsFieldProps) {
  const t = useTranslations('providerPanel.services.form');

  return (
    <fieldset className={s.professionals} data-component="add-service-professionals">
      <legend className={s.label}>{t('professionalsLabel')}</legend>
      <p className={s.hint}>{t('professionalsHelp')}</p>
      <div className={s.professionalsList}>
        {options.map((option) => (
          <label key={option.id} className={s.professionalOption}>
            <input
              type="checkbox"
              className={s.checkbox}
              checked={selected.includes(option.id)}
              onChange={() => onToggle(option.id)}
              disabled={disabled}
              data-component="add-service-professional"
            />
            <span>{option.name}</span>
            {option.outOfPlan ? (
              <span className={s.outOfPlanBadge}>{t('professionalsOutOfPlan')}</span>
            ) : null}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
