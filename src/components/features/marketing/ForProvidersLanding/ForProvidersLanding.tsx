import { ForProvidersBenefits } from '../ForProvidersBenefits';
import { ForProvidersCTA } from '../ForProvidersCTA';
import { ForProvidersFAQ } from '../ForProvidersFAQ';
import { ForProvidersHero } from '../ForProvidersHero';
import { ForProvidersPricing } from '../ForProvidersPricing';

import { forProvidersLandingStyles as s } from './ForProvidersLanding.styles';

/**
 * Orquestador de la landing /profesionales.
 *
 * Server Component que compone, en orden de embudo:
 *  1. Hero (titular + CTAs)
 *  2. Beneficios (4 cards)
 *  3. Pricing (4 planes)
 *  4. FAQ (acordeón nativo)
 *  5. CTA final (alta + ventas)
 *
 * No tiene lógica propia. Las secciones son independientes y se pueden
 * reordenar o reutilizar en otras rutas comerciales si surgen.
 */
export function ForProvidersLanding() {
  return (
    <div className={s.root} data-component="for-providers-landing">
      <ForProvidersHero />
      <ForProvidersBenefits />
      <ForProvidersPricing />
      <ForProvidersFAQ />
      <ForProvidersCTA />
    </div>
  );
}
