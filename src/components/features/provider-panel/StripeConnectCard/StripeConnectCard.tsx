'use client';

import { AlertCircle, Ban, CheckCircle2, Clock, CreditCard, type LucideIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useId } from 'react';

import { BusinessTypePicker } from './BusinessTypePicker';
import {
  resolveConnectCardView,
  resolveReturnNotice,
  useStripeConnectCard,
} from './StripeConnectCard.logic';
import { stripeConnectCardStyles as s, stripeStatusBadge } from './StripeConnectCard.styles';
import type { ConnectCardState, StripeConnectCardProps } from './StripeConnectCard.types';

const STATE_ICONS: Record<Exclude<ConnectCardState, 'unavailable'>, LucideIcon> = {
  disconnected: CreditCard,
  disabled: Ban,
  onboardingIncomplete: Clock,
  requirementsDue: AlertCircle,
  inReview: Clock,
  payoutsPending: Clock,
  active: CheckCircle2,
};

/**
 * Bloque "Pagos" de `/panel/centro`.
 *
 * El estado lo decide `resolveConnectCardView` (sin cuenta, alta sin
 * terminar, faltan datos, en revisión, cobros sin payouts, activo). Sin
 * cuenta, el proveedor elige autónomo o empresa antes de conectar. Las
 * acciones que llaman a Stripe solo aparecen en cuentas Express.
 *
 * Los iconos se renderizan dentro del Client para evitar el bug RSC de
 * `forwardRef` (lección 2026-06-11).
 */
export function StripeConnectCard({
  locale,
  status,
  fetchFailed = false,
  inlineNotice,
}: StripeConnectCardProps) {
  const t = useTranslations('providerPanel.payments');
  const errorId = useId();
  const view = resolveConnectCardView(status, fetchFailed);
  const { businessType, setBusinessType, failure, isPending, handlePrimary, handleOpenDashboard } =
    useStripeConnectCard(locale);

  const returnNotice = inlineNotice === 'return' ? resolveReturnNotice(view.state) : null;
  const StateIcon = view.state === 'unavailable' ? null : STATE_ICONS[view.state];
  const showType = status.exists && status.businessType !== null && !fetchFailed;
  const typeLabel = (type: 'individual' | 'company' | 'other') =>
    type === 'other' ? t('businessType.other') : t(`businessType.${type}.label`);

  return (
    <article className={s.card} data-component="provider-payments" data-state={view.state}>
      <header>
        <h2 className={s.cardTitle}>{t('title')}</h2>
        <p className={s.cardSubtitle}>{t('subtitle')}</p>
      </header>

      {returnNotice ? (
        <p className={returnNotice === 'returnEnabled' ? s.noticeOk : s.noticeInfo} role="status">
          {t(`notices.${returnNotice}`)}
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

      {StateIcon && view.tone ? (
        <div className={s.statusRow} data-component="provider-payments-status">
          <span className={stripeStatusBadge({ tone: view.tone })}>
            <StateIcon className="size-3.5" aria-hidden />
            {t(`status.${view.state as Exclude<ConnectCardState, 'unavailable'>}`)}
          </span>
        </div>
      ) : null}

      {showType ? (
        <p className={s.businessTypeLine} data-component="provider-payments-business-type">
          {t('businessType.current', { type: typeLabel(status.businessType ?? 'other') })}
        </p>
      ) : null}

      <p className={s.description}>{t(`description.${view.state}`)}</p>

      {view.showBusinessTypePicker ? (
        <BusinessTypePicker
          value={businessType}
          onChange={setBusinessType}
          disabled={isPending}
          errorId={failure ? errorId : undefined}
        />
      ) : null}

      {view.managedBySupport ? <p className={s.hint}>{t('notices.managedBySupport')}</p> : null}
      {view.showChangeTypeHelp ? <p className={s.hint}>{t('notices.changeType')}</p> : null}

      {failure ? (
        <p id={errorId} className={s.noticeError} role="alert">
          {failure.code === 'ALREADY_CONNECTED'
            ? t('errors.ALREADY_CONNECTED', { type: typeLabel(failure.existingType ?? 'other') })
            : t(`errors.${failure.code}`)}
        </p>
      ) : null}

      <div className={s.actions}>
        {view.showDashboardLink ? (
          <button
            type="button"
            className={s.secondaryCta}
            onClick={handleOpenDashboard}
            disabled={isPending}
            data-component="provider-payments-cta-dashboard"
          >
            {t('cta.dashboard')}
          </button>
        ) : null}
        <button
          type="button"
          className={view.primaryAction === 'refresh' ? s.secondaryCta : s.primaryCta}
          onClick={() => handlePrimary(view.primaryAction)}
          disabled={isPending}
          data-component={`provider-payments-cta-${view.primaryAction}`}
        >
          {t(`cta.${view.primaryAction}`)}
        </button>
      </div>
    </article>
  );
}
