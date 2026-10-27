import type Stripe from 'stripe';

import type {
  ConnectAccountStatus,
  ConnectBusinessType,
  ConnectDashboardType,
  ConnectReturnUrls,
} from './payments.types';

/**
 * Funciones puras del dominio `payments`: traducen objetos de Stripe a
 * tipos de dominio y componen URLs. Sin I/O, para testearlas sin mocks
 * y poder reutilizarlas desde cualquier service del módulo.
 */

/** Estado de un proveedor que todavía no tiene cuenta conectada. */
export const NO_CONNECT_ACCOUNT_STATUS: ConnectAccountStatus = {
  exists: false,
  detailsSubmitted: false,
  chargesEnabled: false,
  payoutsEnabled: false,
  hasPendingRequirements: false,
  hasPastDueRequirements: false,
  disabledReason: null,
  isDisabled: false,
  businessType: null,
  dashboardType: null,
};

/**
 * Deduce el tipo de dashboard de una cuenta conectada.
 *
 * Las cuentas creadas con `type: 'express'` devuelven `type = 'express'`.
 * Las creadas con `controller` (sin `type`) devuelven `type = 'none'`, así
 * que miramos también `controller.stripe_dashboard.type` para no
 * clasificar mal una cuenta Express si algún día migramos a `controller`.
 */
export function resolveDashboardType(account: Stripe.Account): ConnectDashboardType {
  const dashboard = account.controller?.stripe_dashboard?.type;
  if (account.type === 'express' || dashboard === 'express') return 'express';
  if (account.type === 'standard' || dashboard === 'full') return 'standard';
  if (account.type === 'custom' || account.controller?.requirement_collection === 'application') {
    return 'custom';
  }
  return 'unknown';
}

/** Reduce el `business_type` de Stripe a los dos que ofrecemos. */
function resolveBusinessType(
  businessType: Stripe.Account['business_type'],
): ConnectBusinessType | 'other' | null {
  if (businessType === 'individual' || businessType === 'company') return businessType;
  return businessType ? 'other' : null;
}

/**
 * Un `disabled_reason` bloquea de verdad si no es de tipo
 * `requirements.*`. Una cuenta recién creada ya viene con
 * `requirements.past_due` y una recién enviada con
 * `requirements.pending_verification`: eso es el alta normal, no una
 * cuenta deshabilitada. El resto (`rejected.*`, `under_review`,
 * `platform_paused`, `listed`, `action_required.*`, `other`) se
 * resuelve por soporte.
 */
function isBlockingDisabledReason(reason: string | null): boolean {
  return reason !== null && !reason.startsWith('requirements.');
}

/** Traduce una `Stripe.Account` al estado que consume la UI. */
export function mapAccountToStatus(account: Stripe.Account): ConnectAccountStatus {
  const currentlyDue = account.requirements?.currently_due ?? [];
  const pastDue = account.requirements?.past_due ?? [];
  const disabledReason = account.requirements?.disabled_reason ?? null;

  return {
    exists: true,
    detailsSubmitted: account.details_submitted ?? false,
    chargesEnabled: account.charges_enabled ?? false,
    payoutsEnabled: account.payouts_enabled ?? false,
    hasPendingRequirements: currentlyDue.length > 0 || pastDue.length > 0,
    hasPastDueRequirements: pastDue.length > 0,
    disabledReason,
    isDisabled: isBlockingDisabledReason(disabledReason),
    businessType: resolveBusinessType(account.business_type),
    dashboardType: resolveDashboardType(account),
  };
}

/**
 * Compone las URLs de vuelta del AccountLink.
 *
 * `baseUrl` debe ser el origen público del entorno (en producción
 * `https://yaiwell2.vercel.app` o el dominio final). Quitamos barras
 * finales para no generar `//es/...`, que Stripe acepta pero Next no
 * resuelve igual. En live mode Stripe exige HTTPS en ambas URLs.
 */
export function buildConnectReturnUrls(baseUrl: string, locale: string): ConnectReturnUrls {
  const origin = baseUrl.replace(/\/+$/, '');
  return {
    returnUrl: `${origin}/${locale}/panel/centro/stripe/return`,
    refreshUrl: `${origin}/${locale}/panel/centro/stripe/refresh`,
  };
}
