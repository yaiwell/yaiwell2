/**
 * Cierre del wizard: publicar el negocio en Gratis y, si el plan
 * elegido es de pago, abrir el Checkout de Stripe.
 *
 * Función pura con las dependencias inyectadas (API del wizard y server
 * action del plan) para poder testear cada salida sin red.
 */
import type { PlanActionResult } from '@/app/[locale]/panel/plan/actions';

import type { OnboardingApiError, OnboardingApiResult, PlanTierChoice } from '../shared';

/** Adónde va el usuario al terminar el wizard. */
export type FinalizeOutcome =
  | { kind: 'error'; error: OnboardingApiError }
  /** Navegación interna del panel (con o sin aviso). */
  | { kind: 'panel'; href: string }
  /** Página de pago de Stripe (URL externa). */
  | { kind: 'checkout'; url: string };

export interface FinalizeDeps {
  /** Asigna el plan Gratis y marca el alta como completa. */
  selectFreePlan: () => Promise<OnboardingApiResult<unknown>>;
  /** Crea la sesión de Checkout del plan de pago. */
  startCheckout: (tier: PlanTierChoice) => Promise<PlanActionResult>;
}

/** Ruta del panel del plan con el aviso de que el pago no se abrió. */
export function checkoutFailedHref(tier: PlanTierChoice): string {
  return `/panel/plan?checkout=failed&plan=${tier}`;
}

/**
 * Publica el negocio y decide el destino.
 *
 * El negocio siempre nace en Gratis: el plan de pago solo se aplica
 * cuando Stripe confirma el cobro (webhook o vuelta del Checkout). Si
 * el Checkout no se puede abrir, el alta ya está hecha y lo llevamos a
 * `/panel/plan` con un aviso para que lo intente desde allí.
 *
 * @param tier — plan elegido en el paso 5.
 */
export async function finalizeOnboarding(
  tier: PlanTierChoice,
  deps: FinalizeDeps,
): Promise<FinalizeOutcome> {
  const selected = await deps.selectFreePlan();
  // `ONBOARDING_ALREADY_COMPLETE` se tolera: un doble clic o un
  // refresco ya publicó el negocio.
  if ('error' in selected && selected.error.code !== 'ONBOARDING_ALREADY_COMPLETE') {
    return { kind: 'error', error: selected.error };
  }

  if (tier === 'free') return { kind: 'panel', href: '/panel' };

  let checkout: PlanActionResult;
  try {
    checkout = await deps.startCheckout(tier);
  } catch {
    checkout = { ok: false, code: 'INTERNAL' };
  }
  if (checkout.ok) return { kind: 'checkout', url: checkout.url };
  return { kind: 'panel', href: checkoutFailedHref(tier) };
}
