'use client';

import { useCallback, useState, useTransition } from 'react';

import {
  startOnsiteSetupAction,
  toggleOnsitePaymentAction,
  type OnsiteToggleErrorCode,
  type PlanActionErrorCode,
  type PlanActionResult,
} from '@/app/[locale]/panel/plan/actions';
import type { AppLocale } from '@/i18n/routing';
import { toIntlLocale } from '@/lib/i18n';
// `availability.client` va por import directo (client-safe).
import { BUSINESS_TIMEZONE } from '@/lib/services/availability/availability.client';
import type { OnsiteBillingSummary } from '@/lib/services/billing';
import { formatShortDayMonth } from '@/lib/utils/short-date';

import type { OnsiteCardStatus, OnsiteToggleErrorKey } from './OnsitePaymentCard.types';

/**
 * Estado visible del cobro en el local: activado y ofrecido, desactivado,
 * o activado pero suspendido (sin método de pago o con deuda).
 */
export function resolveOnsiteCardStatus(summary: OnsiteBillingSummary): OnsiteCardStatus {
  if (!summary.enabled) return 'off';
  return summary.effective ? 'on' : 'suspended';
}

/**
 * Si el interruptor admite ahora el cambio: desactivar siempre; activar
 * solo sin bloqueo (método de pago guardado y sin deuda), igual que el
 * servidor.
 */
export function canToggleOnsite(summary: OnsiteBillingSummary): boolean {
  return summary.enabled || summary.enableBlockedBy === null;
}

/** Clave de copy de la línea de estado. */
export function statusTextKey(
  status: OnsiteCardStatus,
): 'statusOn' | 'statusOff' | 'statusSuspended' {
  if (status === 'on') return 'statusOn';
  if (status === 'off') return 'statusOff';
  return 'statusSuspended';
}

/** Clave de copy del botón del método de pago (o «Abriendo Stripe…»). */
export function methodButtonKey(
  summary: OnsiteBillingSummary,
  redirecting: boolean,
): 'redirecting' | 'changeMethod' | 'addMethod' {
  if (redirecting) return 'redirecting';
  return summary.paymentMethodReady ? 'changeMethod' : 'addMethod';
}

/** Fecha `dd/mm` desde la que hay deuda de comisiones, o `null` sin deuda. */
export function formatDebtDate(summary: OnsiteBillingSummary, locale: AppLocale): string | null {
  if (!summary.commissionDebtSince) return null;
  return formatShortDayMonth(summary.commissionDebtSince, toIntlLocale(locale), BUSINESS_TIMEZONE);
}

/** Código del interruptor → copy. */
export function toggleErrorKey(code: OnsiteToggleErrorCode): OnsiteToggleErrorKey {
  if (code === 'PAYMENT_METHOD_MISSING') return 'paymentMethodMissing';
  if (code === 'COMMISSION_DEBT') return 'commissionDebt';
  return 'generic';
}

/**
 * Acciones de la tarjeta: el interruptor (la página se revalida con el
 * estado guardado) y «Añadir método de pago», que lleva a Stripe
 * Checkout en modo `setup`. En éxito el botón sigue «Abriendo Stripe…»
 * hasta que el navegador sale, para que un segundo clic no abra otra
 * sesión.
 */
export function useOnsitePaymentCard(locale: AppLocale) {
  const [isSaving, startTransition] = useTransition();
  const [toggleError, setToggleError] = useState<OnsiteToggleErrorKey | null>(null);
  const [setupError, setSetupError] = useState<PlanActionErrorCode | null>(null);
  const [redirecting, setRedirecting] = useState(false);

  const toggle = useCallback(
    (next: boolean) => {
      setToggleError(null);
      startTransition(async () => {
        try {
          const result = await toggleOnsitePaymentAction(locale, next);
          if (!result.ok) setToggleError(toggleErrorKey(result.code));
        } catch {
          setToggleError('generic');
        }
      });
    },
    [locale],
  );

  const startSetup = useCallback(async () => {
    setSetupError(null);
    setRedirecting(true);
    let result: PlanActionResult;
    try {
      result = await startOnsiteSetupAction(locale);
    } catch {
      result = { ok: false, code: 'INTERNAL' };
    }
    if (result.ok) {
      window.location.assign(result.url);
      return;
    }
    setRedirecting(false);
    setSetupError(result.code);
  }, [locale]);

  return { isSaving, toggleError, setupError, redirecting, toggle, startSetup };
}
