'use client';

import { Building2, User } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { cn } from '@/lib/utils';

import type { BusinessType } from '../../shared';

import { businessTypeStepStyles as s } from './BusinessTypeStep.styles';
import type { BusinessTypeStepProps } from './BusinessTypeStep.types';

/**
 * Paso 1 del wizard — dos cards radio mutuamente excluyentes: el
 * proveedor declara si trabaja como autónomo o como centro con varios
 * profesionales. El valor se persiste en el draft para condicionar el
 * resto del onboarding (futuro: alta de profesionales adicionales).
 */
export function BusinessTypeStep({ value, onChange }: BusinessTypeStepProps) {
  const t = useTranslations('onboarding.businessType');

  // Definimos las dos opciones a render con una pequeña tabla local
  // para no repetir markup. El icono es decorativo: marcado con
  // `aria-hidden` para que los lectores de pantalla anuncien solo el
  // texto de la opción.
  const options: Array<{
    value: BusinessType;
    Icon: typeof User;
    title: string;
    description: string;
  }> = [
    {
      value: 'autonomo',
      Icon: User,
      title: t('autonomo.title'),
      description: t('autonomo.description'),
    },
    {
      value: 'centro',
      Icon: Building2,
      title: t('centro.title'),
      description: t('centro.description'),
    },
  ];

  return (
    <section className={s.root} aria-labelledby="onboarding-business-type-title">
      <header className={s.header}>
        <h2 id="onboarding-business-type-title" className={s.title}>
          {t('title')}
        </h2>
        <p className={s.subtitle}>{t('subtitle')}</p>
      </header>

      <div className={s.grid} role="radiogroup" aria-labelledby="onboarding-business-type-title">
        {options.map(({ value: optValue, Icon, title, description }) => {
          const isSelected = value === optValue;
          return (
            <button
              key={optValue}
              type="button"
              role="radio"
              aria-checked={isSelected}
              className={cn(s.card, isSelected && s.cardSelected)}
              onClick={() => onChange(optValue)}
            >
              <Icon className="text-foreground size-5" aria-hidden />
              <span className={s.cardTitle}>{title}</span>
              <span className={s.cardDescription}>{description}</span>
              <span className={cn(s.radioDot, isSelected && s.radioDotSelected)} aria-hidden>
                {isSelected && <span className={s.radioDotInner} />}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
