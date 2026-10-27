'use client';

import { useState, useTransition } from 'react';

import {
  continueStripeOnboardingAction,
  openStripeDashboardAction,
  refreshStripeStatusAction,
  startStripeOnboardingAction,
  type StripeActionState,
} from '@/app/[locale]/panel/centro/stripe/actions';
import type { AppLocale } from '@/i18n/routing';
import type { ConnectAccountStatus } from '@/lib/services/payments';

import type {
  ConnectBusinessType,
  ConnectCardPrimaryAction,
  ConnectCardState,
  ConnectCardTone,
  ConnectCardView,
  StripeActionFailure,
} from './StripeConnectCard.types';

/** Badge y CTA principal de cada estado. */
const STATE_PRESETS: Record<
  ConnectCardState,
  { tone: ConnectCardTone | null; primaryAction: ConnectCardPrimaryAction }
> = {
  unavailable: { tone: null, primaryAction: 'refresh' },
  disconnected: { tone: 'busy', primaryAction: 'connect' },
  disabled: { tone: 'busy', primaryAction: 'refresh' },
  onboardingIncomplete: { tone: 'soon', primaryAction: 'continue' },
  requirementsDue: { tone: 'soon', primaryAction: 'completeData' },
  inReview: { tone: 'info', primaryAction: 'refresh' },
  payoutsPending: { tone: 'info', primaryAction: 'refresh' },
  active: { tone: 'now', primaryAction: 'refresh' },
};

/**
 * Decide el estado de la tarjeta. El orden importa:
 *  1. Sin datos de Stripe o sin cuenta: no hay nada más que mirar.
 *  2. Cuenta deshabilitada por Stripe (rechazo, revisión manual…): va
 *     antes que todo lo demás para no mostrarla nunca como "En revisión"
 *     ni invitar a un alta que no la va a desbloquear.
 *  3. Alta sin enviar (`details_submitted = false`): continuar el alta.
 *  4. Requisitos en `currently_due`/`past_due`: completar datos, aunque
 *     los cobros sigan activos (Stripe los cortará al vencer el plazo).
 *  5. Cobros activos sin payouts: ya cobra, el banco llega después.
 *  6. Todo activo.
 *  7. Alta enviada, nada pendiente y cobros aún desactivados: Stripe
 *     está verificando.
 */
function resolveState(status: ConnectAccountStatus, fetchFailed: boolean): ConnectCardState {
  if (fetchFailed) return 'unavailable';
  if (!status.exists) return 'disconnected';
  if (status.isDisabled) return 'disabled';
  if (!status.detailsSubmitted) return 'onboardingIncomplete';
  if (status.hasPendingRequirements) return 'requirementsDue';
  if (status.chargesEnabled && !status.payoutsEnabled) return 'payoutsPending';
  if (status.chargesEnabled && status.payoutsEnabled) return 'active';
  return 'inReview';
}

/**
 * Traduce el estado de Stripe a lo que pinta la tarjeta.
 *
 * Las acciones que llaman a Stripe (AccountLink y login link) solo se
 * ofrecen a cuentas Express: la cuenta Custom de pruebas de Studio Aura
 * solo ve su estado y "Actualizar estado", que nunca falla.
 */
export function resolveConnectCardView(
  status: ConnectAccountStatus,
  fetchFailed = false,
): ConnectCardView {
  const state = resolveState(status, fetchFailed);
  const preset = STATE_PRESETS[state];
  const isExpress = status.dashboardType === 'express';
  const managedBySupport = status.exists && !fetchFailed && !isExpress;

  return {
    state,
    tone: preset.tone,
    // Sin Express no hay enlace de alta que ofrecer: solo refrescar.
    primaryAction: managedBySupport ? 'refresh' : preset.primaryAction,
    showBusinessTypePicker: state === 'disconnected',
    showDashboardLink: isExpress && !fetchFailed && status.detailsSubmitted,
    managedBySupport,
    showChangeTypeHelp: isExpress && state === 'onboardingIncomplete',
  };
}

/** Elige el aviso al volver de Stripe según el estado real de la cuenta. */
export function resolveReturnNotice(
  state: ConnectCardState,
): 'returnEnabled' | 'returnPending' | 'returnIncomplete' | null {
  if (state === 'active') return 'returnEnabled';
  if (state === 'onboardingIncomplete') return 'returnIncomplete';
  if (state === 'unavailable' || state === 'disconnected' || state === 'disabled') return null;
  return 'returnPending';
}

/**
 * Estado y handlers de la tarjeta. Las actions redirigen a Stripe en
 * éxito; si devuelven `{ ok: false }` guardamos el código para el aviso.
 */
export function useStripeConnectCard(locale: AppLocale) {
  const [businessType, setBusinessType] = useState<ConnectBusinessType | null>(null);
  const [failure, setFailure] = useState<StripeActionFailure | null>(null);
  const [isPending, startTransition] = useTransition();

  function run(action: () => Promise<StripeActionState>) {
    setFailure(null);
    startTransition(async () => {
      const result = await action();
      if (result && !result.ok) setFailure(result);
    });
  }

  function handlePrimary(primaryAction: ConnectCardPrimaryAction) {
    if (primaryAction === 'connect') {
      // Sin elección explícita no creamos cuenta: una sociedad dada de
      // alta como autónomo no puede corregirse sin soporte.
      if (!businessType) {
        setFailure({ ok: false, code: 'INVALID_INPUT' });
        return;
      }
      run(() => startStripeOnboardingAction(locale, { businessType }));
      return;
    }
    if (primaryAction === 'continue' || primaryAction === 'completeData') {
      run(() => continueStripeOnboardingAction(locale));
      return;
    }
    run(() => refreshStripeStatusAction(locale));
  }

  function handleOpenDashboard() {
    run(() => openStripeDashboardAction(locale));
  }

  return {
    businessType,
    setBusinessType,
    failure,
    isPending,
    handlePrimary,
    handleOpenDashboard,
  };
}
