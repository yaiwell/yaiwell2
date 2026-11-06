/**
 * Props del orquestador de la landing /profesionales.
 */

import type { FounderPromoAvailability } from '@/lib/services/billing';
import type { PublicPlan } from '@/lib/services/plans';

export interface ForProvidersLandingProps {
  /**
   * Planes reales leídos de BD por la page. `null` significa que no se
   * han podido cargar (tabla sin sembrar): en ese caso la sección de
   * precios no se renderiza. Nunca caemos a tarifas hardcodeadas —
   * publicar una comisión distinta de la que Stripe cobra es el bug
   * que esta prop existe para impedir.
   */
  plans: PublicPlan[] | null;
  /** Plazas del regalo de Mallorca; `null` oculta el aviso (sin plazas o sin datos). */
  founderPromo?: FounderPromoAvailability | null;
}
