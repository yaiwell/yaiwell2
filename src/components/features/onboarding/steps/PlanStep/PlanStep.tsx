'use client';

import { useTranslations } from 'next-intl';

import { PlanCard } from '@/components/features/provider-panel/PlanPicker';

import { planStepStyles as s } from './PlanStep.styles';
import type { PlanStepProps } from './PlanStep.types';

/**
 * Paso 5 del wizard — elección de plan con las mismas tarjetas que el
 * panel (cuota con IVA, servicios y comisión), como grupo de radios.
 *
 * Llega preseleccionado con el plan elegido en el registro. El cobro no
 * ocurre aquí: al publicar, si el plan es de pago, el orquestador abre
 * el Checkout de Stripe.
 */
export function PlanStep({ plans, value, onChange, locale }: PlanStepProps) {
  const t = useTranslations('onboarding.planStep');
  const tCard = useTranslations('providerPanel.plan.card');

  return (
    <section className={s.root} aria-labelledby="onboarding-plan-title">
      <header className={s.header}>
        <h2 id="onboarding-plan-title" className={s.title}>
          {t('title')}
        </h2>
        <p className={s.subtitle}>{t('subtitle')}</p>
      </header>

      {plans.length > 0 ? (
        <fieldset className={s.fieldset}>
          <legend className={s.legend}>{t('legend')}</legend>
          {plans.map((plan) => {
            const checked = plan.tier === value;
            return (
              <label key={plan.tier} className={s.option}>
                <input
                  type="radio"
                  name="onboarding-plan"
                  value={plan.tier}
                  checked={checked}
                  onChange={() => onChange(plan.tier)}
                  className={s.radio}
                  data-testid={`onboarding-plan-${plan.tier}`}
                />
                <PlanCard
                  as="div"
                  plan={plan}
                  locale={locale}
                  emphasis={checked ? 'selected' : 'none'}
                  badge={checked ? tCard('selectedBadge') : null}
                />
              </label>
            );
          })}
        </fieldset>
      ) : null}

      <p className={s.note} aria-live="polite">
        {plans.length === 0 ? t('unavailable') : value === 'free' ? t('freeNote') : t('paidNote')}
      </p>
    </section>
  );
}
