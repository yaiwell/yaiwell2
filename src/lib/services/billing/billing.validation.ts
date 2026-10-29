import { z } from 'zod';

import { routing } from '@/i18n/routing';
import { PLAN_TIERS } from '@/lib/services/plans';

import { PAID_PLAN_TIERS } from './billing.catalog';

/**
 * Validación de los bordes del dominio `billing`: lo que llega del
 * formulario del panel y lo que llega de Stripe (metadata, lookup keys).
 * Nada de eso se da por bueno aunque TypeScript lo tipe.
 */

/** Cualquier tier del catálogo. */
export const planTierSchema = z.enum(PLAN_TIERS);

/** Tiers que se contratan con suscripción. */
export const paidPlanTierSchema = z.enum(PAID_PLAN_TIERS);

/** Idioma de la web (decide el idioma del Checkout y del portal). */
export const billingLocaleSchema = z.enum(routing.locales);

/** Metadata que ponemos en Customer, Checkout y Subscription. */
export const providerMetadataSchema = z.object({
  providerId: z.string().min(1).max(64),
});

/** Metadata del price creada por `stripe:sync-plans`. */
export const priceMetadataSchema = z.object({ tier: planTierSchema });

/** Entrada de la action «Contratar plan». */
export const startPlanCheckoutSchema = z.object({
  tier: paidPlanTierSchema,
});

/** Entrada de la action que abre el Customer Portal. */
export const openBillingPortalSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('manage') }),
  z.object({ type: z.literal('payment_method_update') }),
  z.object({ type: z.literal('subscription_update_confirm'), tier: paidPlanTierSchema }),
  z.object({ type: z.literal('subscription_cancel') }),
]);

/**
 * Intención que pide la UI del panel al abrir el portal. Se traduce a un
 * recorrido (`openBillingPortalSchema`) en la action; `change` exige tier.
 */
export const billingPortalIntentSchema = z.enum(['manage', 'payment_method', 'change', 'cancel']);

/** `session_id` que vuelve en la URL de éxito del Checkout. */
export const checkoutSessionIdSchema = z.string().regex(/^cs_(test|live)_[A-Za-z0-9]+$/);

export type StartPlanCheckoutParsed = z.infer<typeof startPlanCheckoutSchema>;
export type BillingPortalIntent = z.infer<typeof billingPortalIntentSchema>;
export type OpenBillingPortalParsed = z.infer<typeof openBillingPortalSchema>;
