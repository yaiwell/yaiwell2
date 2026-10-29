'use client';

import { useCallback, useState } from 'react';

import {
  openBillingPortalAction,
  startPlanCheckoutAction,
} from '@/app/[locale]/panel/plan/actions';
import type { AppLocale } from '@/i18n/routing';
import type { PlanTierId } from '@/lib/services/plans';

import type {
  BillingPortalIntent,
  PlanActionErrorCode,
  PlanActionKey,
  PlanActionResult,
} from './plan-shared.types';

/** Clave estable del botón del portal (intención + tier destino). */
export function portalActionKey(intent: BillingPortalIntent, tier?: PlanTierId): PlanActionKey {
  return `portal:${intent}:${tier ?? ''}`;
}

/** Clave estable del botón de contratar un plan. */
export function checkoutActionKey(tier: PlanTierId): PlanActionKey {
  return `checkout:${tier}`;
}

/**
 * Lanza las actions de facturación y lleva al navegador a Stripe.
 *
 * En éxito no reseteamos `pendingKey`: el botón sigue «Abriendo…» hasta
 * que el navegador sale de la página (un segundo clic abriría otra
 * sesión). En fallo guardamos el código para el aviso i18n.
 */
export function usePlanBillingActions(locale: AppLocale) {
  const [pendingKey, setPendingKey] = useState<PlanActionKey | null>(null);
  const [errorCode, setErrorCode] = useState<PlanActionErrorCode | null>(null);

  const run = useCallback(async (key: PlanActionKey, action: () => Promise<PlanActionResult>) => {
    setErrorCode(null);
    setPendingKey(key);
    let result: PlanActionResult;
    try {
      result = await action();
    } catch {
      // Red caída o action que lanzó: mismo copy que un fallo interno.
      result = { ok: false, code: 'INTERNAL' };
    }
    if (result.ok) {
      window.location.assign(result.url);
      return;
    }
    setPendingKey(null);
    setErrorCode(result.code);
  }, []);

  const openPortal = useCallback(
    (intent: BillingPortalIntent, tier?: PlanTierId) =>
      run(portalActionKey(intent, tier), () => openBillingPortalAction(locale, intent, tier)),
    [locale, run],
  );

  const startCheckout = useCallback(
    (tier: PlanTierId) => run(checkoutActionKey(tier), () => startPlanCheckoutAction(locale, tier)),
    [locale, run],
  );

  return { pendingKey, isBusy: pendingKey !== null, errorCode, openPortal, startCheckout };
}
