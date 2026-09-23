import { ForProvidersBenefits } from '../ForProvidersBenefits';
import { ForProvidersCTA } from '../ForProvidersCTA';
import { ForProvidersFAQ } from '../ForProvidersFAQ';
import { ForProvidersHero } from '../ForProvidersHero';
import { ForProvidersPricing } from '../ForProvidersPricing';

import { forProvidersLandingStyles as s } from './ForProvidersLanding.styles';
import type { ForProvidersLandingProps } from './ForProvidersLanding.types';

/**
 * Orquestador de la landing /profesionales.
 *
 * Server Component que compone, en orden de embudo:
 *  1. Hero (titular + CTAs)
 *  2. Beneficios (4 cards)
 *  3. Pricing (4 planes, con tarifas de BD)
 *  4. FAQ (acordeón nativo)
 *  5. CTA final (alta + ventas)
 *
 * No tiene lógica propia más allá de decidir si hay tarifas que
 * publicar: el resto del embudo funciona igual sin la sección de
 * precios, así que la ausencia de planes no tumba la página entera.
 */
export function ForProvidersLanding({ plans }: ForProvidersLandingProps) {
  return (
    <div className={s.root} data-component="for-providers-landing">
      <ForProvidersHero />
      <ForProvidersBenefits />
      {plans && <ForProvidersPricing plans={plans} />}
      <ForProvidersFAQ />
      <ForProvidersCTA />
    </div>
  );
}
