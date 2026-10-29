'use client';

import { useCallback } from 'react';

import type { AppLocale } from '@/i18n/routing';
import type { PlanTierId } from '@/lib/services/plans';

import { usePlanBillingActions } from '../plan-shared';

import type { PlanCtaKind } from './PlanPicker.types';

/**
 * Conecta la CTA de cada tarjeta con la action de Stripe que le toca:
 * Checkout para contratar, portal para cambiar, cancelar o actualizar
 * la tarjeta.
 */
export function usePlanPicker(locale: AppLocale) {
  const { pendingKey, isBusy, errorCode, openPortal, startCheckout } =
    usePlanBillingActions(locale);

  const handleCta = useCallback(
    (kind: PlanCtaKind, tier: PlanTierId) => {
      switch (kind) {
        case 'subscribe':
          return startCheckout(tier);
        case 'change':
          return openPortal('change', tier);
        case 'downgrade_free':
          return openPortal('cancel');
        case 'fix_payment':
          return openPortal('payment_method');
        default:
          return undefined;
      }
    },
    [openPortal, startCheckout],
  );

  return { pendingKey, isBusy, errorCode, handleCta };
}
