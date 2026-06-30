'use client';

import { CheckCircle2, CreditCard, Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useTransition } from 'react';

import {
  refreshStripeStatusAction,
  startStripeOnboardingAction,
} from '@/app/[locale]/panel/centro/stripe/actions';

import { stripeConnectCardStyles as s } from './StripeConnectCard.styles';
import type { StripeConnectCardProps } from './StripeConnectCard.types';

/**
 * Bloque "Pagos" en `/panel/centro`.
 *
 * Tres estados visuales según `ConnectAccountStatus`:
 *  1. **No conectado** (`!status.exists`): copy explicativo + CTA
 *     primario "Conectar con Stripe" que dispara la server action
 *     `startStripeOnboardingAction`. La action redirige al onboarding
 *     de Stripe; al volver, Stripe nos redirige a `/stripe/return`
 *     que pasa por aquí con `?stripe=return`.
 *  2. **Onboarding pendiente** (`status.exists` pero `!chargesEnabled`
 *     o `hasPendingRequirements`): badge ámbar + CTA "Continuar
 *     onboarding" que vuelve a generar AccountLink y redirige.
 *  3. **Habilitado** (`chargesEnabled && payoutsEnabled`): badge
 *     verde + CTA secundario "Actualizar estado" que sólo revalida.
 *
 * Si `fetchFailed`, mostramos copy de error con CTA "Reintentar" que
 * revalida para forzar otra consulta a Stripe.
 *
 * Iconos `CheckCircle2`/`CreditCard`/`Loader2` renderizados dentro del
 * Client para evitar el bug RSC de `forwardRef` (lección 2026-06-11).
 */
export function StripeConnectCard({
  locale,
  status,
  fetchFailed,
  inlineNotice,
}: StripeConnectCardProps) {
  const t = useTranslations('providerPanel.payments');
  const [isPending, startTransition] = useTransition();

  const enabled = status.exists && status.chargesEnabled && status.payoutsEnabled;
  const pending = status.exists && (!status.chargesEnabled || status.hasPendingRequirements);
  const disconnected = !status.exists;

  function handleConnect() {
    startTransition(async () => {
      // Si la action falla devuelve { ok: false, code }; el éxito
      // redirige a Stripe y nunca volvemos.
      await startStripeOnboardingAction(locale);
    });
  }

  function handleRefresh() {
    startTransition(async () => {
      await refreshStripeStatusAction(locale);
    });
  }

  return (
    <article className={s.card} data-component="provider-payments">
      <header>
        <h2 className={s.cardTitle}>{t('title')}</h2>
        <p className={s.cardSubtitle}>{t('subtitle')}</p>
      </header>

      {inlineNotice === 'return' && enabled ? (
        <p className={s.noticeOk} role="status">
          {t('notices.returnEnabled')}
        </p>
      ) : null}
      {inlineNotice === 'return' && pending ? (
        <p className={s.noticeOk} role="status">
          {t('notices.returnPending')}
        </p>
      ) : null}
      {inlineNotice === 'refresh-failed' ? (
        <p className={s.noticeError} role="alert">
          {t('notices.refreshFailed')}
        </p>
      ) : null}
      {fetchFailed ? (
        <p className={s.noticeError} role="alert">
          {t('notices.fetchFailed')}
        </p>
      ) : null}

      <div className={s.statusRow} data-component="provider-payments-status">
        {enabled ? (
          <span className={`${s.badge} ${s.badgeOk}`}>
            <CheckCircle2 className="size-3.5" aria-hidden />
            {t('status.enabled')}
          </span>
        ) : null}
        {pending ? (
          <span className={`${s.badge} ${s.badgePending}`}>
            <Loader2 className="size-3.5" aria-hidden />
            {t('status.pending')}
          </span>
        ) : null}
        {disconnected ? (
          <span className={`${s.badge} ${s.badgeOff}`}>
            <CreditCard className="size-3.5" aria-hidden />
            {t('status.disconnected')}
          </span>
        ) : null}
      </div>

      <p className={s.description}>
        {enabled ? t('description.enabled') : null}
        {pending ? t('description.pending') : null}
        {disconnected ? t('description.disconnected') : null}
      </p>

      <div className={s.actions}>
        {disconnected || pending ? (
          <button
            type="button"
            className={s.primaryCta}
            onClick={handleConnect}
            disabled={isPending}
            data-component="provider-payments-cta-connect"
          >
            {disconnected ? t('cta.connect') : t('cta.continue')}
          </button>
        ) : (
          <button
            type="button"
            className={s.secondaryCta}
            onClick={handleRefresh}
            disabled={isPending}
            data-component="provider-payments-cta-refresh"
          >
            {t('cta.refresh')}
          </button>
        )}
      </div>
    </article>
  );
}
