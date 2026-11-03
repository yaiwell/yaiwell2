'use client';

import { Users } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { ProfessionalAvatar } from '@/components/shared/ProfessionalAvatar';

import { shouldShowProfessionalPicker } from './ProfessionalPicker.logic';
import { professionalPickerStyles as s } from './ProfessionalPicker.styles';
import type { ProfessionalPickerProps } from './ProfessionalPicker.types';

/**
 * Selector «¿Quién quieres que te atienda?» del paso de hueco (CLAUDE.md
 * §4.bis «Equipo», decidido 2026-11-03).
 *
 * «Cualquiera disponible» va primero y es el valor por defecto: enseña
 * la unión de huecos del equipo y el servidor asigna a quien toque al
 * reservar. Con un solo profesional no se pinta.
 *
 * Client Component: radios controlados por el orquestador del flujo.
 */
export function ProfessionalPicker({ professionals, value, onChange }: ProfessionalPickerProps) {
  const t = useTranslations('booking.professionalPicker');
  const tSummary = useTranslations('booking.summary');
  if (!shouldShowProfessionalPicker(professionals)) return null;

  return (
    <fieldset className={s.root} data-component="booking-professional-picker">
      <legend className={s.legend}>{t('legend')}</legend>
      <div className={s.options}>
        <label className={s.option} data-component="booking-professional-picker-any">
          <input
            type="radio"
            name="booking-professional"
            value=""
            className={s.radio}
            checked={value === null}
            aria-describedby="booking-professional-picker-hint"
            onChange={() => onChange(null)}
          />
          <span className={s.anyIcon} aria-hidden>
            <Users className={s.anyIconSvg} />
          </span>
          <span className={s.optionName}>{tSummary('anyProfessional')}</span>
        </label>
        {professionals.map((professional) => (
          <label
            key={professional.id}
            className={s.option}
            data-component={`booking-professional-picker-${professional.id}`}
          >
            <input
              type="radio"
              name="booking-professional"
              value={professional.id}
              className={s.radio}
              checked={value === professional.id}
              onChange={() => onChange(professional.id)}
            />
            <ProfessionalAvatar name={professional.name} photo={professional.photo} size="sm" />
            <span className={s.optionName}>{professional.name}</span>
          </label>
        ))}
      </div>
      <p id="booking-professional-picker-hint" className={s.hint}>
        {t('anyHint')}
      </p>
    </fieldset>
  );
}
