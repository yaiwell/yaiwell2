/**
 * Identificadores del catálogo de planes en Stripe.
 *
 * Módulo puro (sin Prisma ni `server-only`): lo comparten el service y el
 * script `scripts/stripe-sync-plans.ts`, que corre fuera de Next.
 */
import type { PaidPlanTier } from './billing.types';

/** Tiers con suscripción, en orden comercial ascendente. */
export const PAID_PLAN_TIERS = [
  'basic',
  'pro',
  'premium',
] as const satisfies readonly PaidPlanTier[];

/** Moneda de las cuotas. */
export const PLAN_CURRENCY = 'eur';

/**
 * `lookup_key` del precio mensual vigente de un tier. Es lo que busca el
 * service: el `price_…` cambia cuando cambia el importe (Stripe no deja
 * editar `unit_amount`), la lookup key no.
 */
export function planPriceLookupKey(tier: PaidPlanTier): string {
  return `yaiwell_${tier}_monthly_eur`;
}

/** Id fijo del Product de Stripe de un tier (creado por el script). */
export function planProductId(tier: PaidPlanTier): string {
  return `yaiwell_plan_${tier}`;
}

const LOOKUP_KEY_PATTERN = /^yaiwell_([a-z]+)_monthly_eur$/;

/** Extrae el tier de una lookup key nuestra; `null` si no lo es. */
export function tierFromLookupKey(lookupKey: string | null | undefined): string | null {
  if (!lookupKey) return null;
  return LOOKUP_KEY_PATTERN.exec(lookupKey)?.[1] ?? null;
}

/** Idiomas de la web que Stripe sabe pintar en Checkout, portal y facturas. */
export type StripeUiLocale = 'es' | 'en' | 'de';

/**
 * Idioma para las páginas y facturas de Stripe. Stripe no tiene catalán:
 * quien navega en `ca` ve Stripe en castellano, que es lo que todo
 * usuario catalán lee, en vez de en inglés por defecto.
 */
export function toStripeLocale(locale: 'es' | 'ca' | 'en' | 'de'): StripeUiLocale {
  return locale === 'ca' ? 'es' : locale;
}

/**
 * Marca del Tax Rate del IVA de las cuotas (21 %, incluido en el precio).
 * Stripe no deja fijar el id de un Tax Rate: lo localizamos por esta
 * metadata, que pone `stripe:sync-plans` al crearlo.
 */
export const VAT_TAX_RATE_METADATA = { yaiwell: 'vat_es_21_inclusive' } as const;

/** Parámetros del Tax Rate del IVA (los usa el script y la validación). */
export const VAT_TAX_RATE = {
  display_name: 'IVA',
  percentage: 21,
  inclusive: true,
  country: 'ES',
  jurisdiction: 'ES',
  tax_type: 'vat',
} as const;

/**
 * Marca de la configuración del Customer Portal de planes. Stripe asigna
 * el id (`bpc_…`): la localizamos por esta metadata, que pone el script.
 */
export const PORTAL_CONFIG_METADATA = { yaiwell: 'plans_portal' } as const;

/** Enlaces legales que muestra el portal (obligatorios para activarlo). */
export const PORTAL_LEGAL_URLS = {
  privacy_policy_url: 'https://www.yaiwell.app/es/privacidad',
  terms_of_service_url: 'https://www.yaiwell.app/es/terminos',
} as const;

/** Product y price vigente de un tier, para el cambio de plan del portal. */
export interface PortalPlanProduct {
  product: string;
  prices: string[];
}

/**
 * Funcionalidades del Customer Portal de planes (fuente única: el script
 * las aplica y los tests las fijan):
 *  - subida de plan al momento con factura de prorrateo
 *    (`always_invoice`); bajada al final del periodo (`schedule_at_period_end`
 *    con `decreasing_item_amount`), que crea el schedule que leemos;
 *  - cancelación al final del periodo (el negocio paga el mes en curso y
 *    luego pasa a Gratis);
 *  - tarjeta, historial de facturas y datos fiscales (nombre, dirección,
 *    NIF/CIF).
 */
export function buildPortalFeatures(products: PortalPlanProduct[]) {
  return {
    customer_update: {
      enabled: true,
      allowed_updates: ['name', 'address', 'tax_id'] as Array<'name' | 'address' | 'tax_id'>,
    },
    invoice_history: { enabled: true },
    payment_method_update: { enabled: true },
    subscription_cancel: {
      enabled: true,
      mode: 'at_period_end' as const,
      proration_behavior: 'none' as const,
    },
    subscription_update: {
      enabled: true,
      default_allowed_updates: ['price'] as Array<'price'>,
      proration_behavior: 'always_invoice' as const,
      products,
      schedule_at_period_end: { conditions: [{ type: 'decreasing_item_amount' as const }] },
    },
  };
}
