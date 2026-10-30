import { z } from 'zod';

import { PLAN_TIERS, type PlanTierId } from '@/lib/services/plans';
import { isLiveSubscriptionStatus } from '@/lib/utils/plan-billing';

/**
 * Validación de la query de `/panel/plan` (`?checkout`, `?session_id`,
 * `?plan`, `?onsite_setup`) y del resultado de la vuelta del Checkout. Funciones puras: la
 * página solo orquesta.
 */

/** Valores que la página entiende en `?checkout=`. */
const CHECKOUT_VALUES = ['success', 'cancelled', 'failed'] as const;

export type CheckoutParam = (typeof CHECKOUT_VALUES)[number];

/**
 * Vuelta del Checkout en modo `setup` del cobro en el local
 * (`?onsite_setup=`): guardar el método de pago de las comisiones.
 */
const ONSITE_SETUP_VALUES = ['success', 'cancelled'] as const;

export type OnsiteSetupParam = (typeof ONSITE_SETUP_VALUES)[number];

/**
 * Query de la página. Todo llega del navegador (o de Stripe): cada campo
 * inválido se descarta en vez de romper la página.
 */
const planPageQuerySchema = z.object({
  checkout: z.enum(CHECKOUT_VALUES).optional().catch(undefined),
  session_id: z.string().min(1).max(255).optional().catch(undefined),
  plan: z.enum(PLAN_TIERS).optional().catch(undefined),
  onsite_setup: z.enum(ONSITE_SETUP_VALUES).optional().catch(undefined),
});

export interface PlanPageQuery {
  checkout: CheckoutParam | null;
  sessionId: string | null;
  plan: PlanTierId | null;
  onsiteSetup: OnsiteSetupParam | null;
}

/** Normaliza `searchParams` (un valor repetido llega como array). */
export function parsePlanPageQuery(
  searchParams: Record<string, string | string[] | undefined>,
): PlanPageQuery {
  const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);
  const parsed = planPageQuerySchema.parse({
    checkout: first(searchParams.checkout),
    session_id: first(searchParams.session_id),
    plan: first(searchParams.plan),
    onsite_setup: first(searchParams.onsite_setup),
  });
  return {
    checkout: parsed.checkout ?? null,
    sessionId: parsed.session_id ?? null,
    plan: parsed.plan ?? null,
    onsiteSetup: parsed.onsite_setup ?? null,
  };
}

/**
 * Resultado de confirmar la sesión de Checkout al volver de Stripe:
 *  - `synced`: la suscripción ya está sincronizada.
 *  - `pending`: Stripe aún no la ha creado (llegará por webhook).
 *  - `mismatch`: la sesión no es de este negocio o no es válida.
 *  - `error`: Stripe no respondió; el webhook la sincronizará igual.
 */
export type CheckoutConfirmOutcome = 'synced' | 'pending' | 'mismatch' | 'error';

/**
 * Estado del aviso de la vuelta del Checkout. Si el espejo ya refleja
 * una suscripción viva damos el plan por activado aunque la
 * confirmación directa no lo haya visto (el webhook llegó antes).
 */
export function resolveCheckoutState(
  outcome: CheckoutConfirmOutcome | null,
  subscriptionStatus: string | null,
): 'activating' | 'activated' | null {
  if (outcome === null || outcome === 'mismatch') return null;
  if (outcome === 'synced' || isLiveSubscriptionStatus(subscriptionStatus)) return 'activated';
  return 'activating';
}
