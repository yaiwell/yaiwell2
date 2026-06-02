import { Check } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Link } from '@/i18n/navigation';

import { forProvidersPricingStyles as s } from './ForProvidersPricing.styles';
import type { PricingPlan } from './ForProvidersPricing.types';

/**
 * Catálogo de planes. Mantener sincronizado con CLAUDE.md §4 (entidad
 * `Plan`) y con futuros productos en Stripe Billing. Cambiar precios o
 * comisiones aquí NO toca la BD: este componente es marketing puro.
 *
 * El plan "Pro" se marca como popular porque es el sweet spot para
 * centros con varios profesionales (target principal Yeiwell).
 */
const plans: PricingPlan[] = [
  {
    id: 'free',
    priceEur: 0,
    commission: '12%',
    popular: false,
    featureKeys: ['feature1', 'feature2', 'feature3', 'feature4'],
  },
  {
    id: 'basic',
    priceEur: 19,
    commission: '9%',
    popular: false,
    featureKeys: ['feature1', 'feature2', 'feature3', 'feature4'],
  },
  {
    id: 'pro',
    priceEur: 49,
    commission: '6%',
    popular: true,
    featureKeys: ['feature1', 'feature2', 'feature3', 'feature4'],
  },
  {
    id: 'premium',
    priceEur: 99,
    commission: '4%',
    popular: false,
    featureKeys: ['feature1', 'feature2', 'feature3', 'feature4'],
  },
];

/**
 * Sección de precios para proveedores.
 *
 * Server Component. Cada card tiene su propio CTA que pasa el `plan`
 * por query string para preseleccionarlo en el alta. No conecta con
 * Stripe en MVP visual; es puro mock comercial.
 */
export function ForProvidersPricing() {
  const t = useTranslations('forProviders.pricing');

  return (
    <section
      id="planes"
      className={s.root}
      data-component="for-providers-pricing"
      aria-labelledby="for-providers-pricing-title"
    >
      <div className={s.container}>
        <header className={s.header}>
          <span className={s.eyebrow}>{t('eyebrow')}</span>
          <h2 id="for-providers-pricing-title" className={s.title}>
            {t('title')}
          </h2>
          <p className={s.subtitle}>{t('subtitle')}</p>
        </header>

        <div className={s.grid}>
          {plans.map((plan) => {
            const cardClass = plan.popular ? s.cardPopular : s.card;
            return (
              <article
                key={plan.id}
                className={cardClass}
                data-component={`for-providers-plan-${plan.id}`}
              >
                {plan.popular && (
                  <span className={s.popularBadge}>{t('popularBadge')}</span>
                )}

                <header className="flex flex-col gap-1.5">
                  <h3 className={s.planName}>{t(`plans.${plan.id}.name`)}</h3>
                  <p className={s.planTagline}>{t(`plans.${plan.id}.tagline`)}</p>
                </header>

                <div className="flex flex-col gap-2">
                  <div className={s.priceRow}>
                    <span className={s.priceCurrency}>€</span>
                    <span className={s.priceValue}>{plan.priceEur}</span>
                    <span className={s.priceSuffix}>{t('perMonth')}</span>
                  </div>
                  <span className={s.commission}>
                    {t('commission', { rate: plan.commission })}
                  </span>
                </div>

                <ul className={s.features}>
                  {plan.featureKeys.map((key) => (
                    <li key={key} className={s.feature}>
                      <Check className={s.checkIcon} aria-hidden="true" />
                      <span>{t(`plans.${plan.id}.${key}`)}</span>
                    </li>
                  ))}
                </ul>

                <Link
                  href={`/registro?as=provider&plan=${plan.id}`}
                  className={plan.popular ? s.cta : s.ctaGhost}
                  data-component={`for-providers-plan-cta-${plan.id}`}
                >
                  {t('ctaStart')}
                </Link>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
