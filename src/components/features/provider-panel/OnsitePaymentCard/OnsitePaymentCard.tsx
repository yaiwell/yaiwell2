'use client';

import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';

import { formatCurrencyFromCents } from '../DashboardMetrics/DashboardMetrics.logic';
import { PlanActionError } from '../plan-shared';
import {
  canToggleOnsite,
  formatDebtDate,
  methodButtonKey,
  resolveOnsiteCardStatus,
  statusTextKey,
  useOnsitePaymentCard,
} from './OnsitePaymentCard.logic';
import { onsitePaymentCardStyles as s } from './OnsitePaymentCard.styles';
import type { OnsitePaymentCardProps } from './OnsitePaymentCard.types';

/**
 * Tarjeta «Cobro en el local» de `/panel/plan` (§4.bis, decidido
 * 2026-10-30): el pago en el local es opcional por negocio. Para
 * activarlo hace falta un método de pago con el que cobrar las
 * comisiones (Checkout de Stripe en modo `setup`); con comisiones
 * impagadas queda suspendido hasta que se cobren.
 *
 * Client Component: interruptor y botón de Stripe. Los datos llegan del
 * servidor (`getOnsiteBillingSummary`) y se revalidan tras cada cambio.
 */
export function OnsitePaymentCard({ summary, locale }: OnsitePaymentCardProps) {
  const t = useTranslations('providerPanel.plan.onsite');
  const { isSaving, toggleError, setupError, redirecting, toggle, startSetup } =
    useOnsitePaymentCard(locale);

  const status = resolveOnsiteCardStatus(summary);
  const debtDate = formatDebtDate(summary, locale);

  return (
    <section className={s.card} data-component="onsite-payment-card" data-status={status}>
      <header className={s.header}>
        <h2 className={s.title}>{t('title')}</h2>
        <p className={s.description}>{t('description')}</p>
      </header>

      <div className={s.toggleRow}>
        <div className={s.toggleText}>
          <span className={s.toggleLabel} id="onsite-payment-toggle-label">
            {t('toggleLabel')}
          </span>
          <span
            className={status === 'suspended' ? s.statusSuspended : s.status}
            data-component="onsite-payment-status"
          >
            {isSaving ? t('saving') : t(statusTextKey(status))}
          </span>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={summary.enabled}
          aria-labelledby="onsite-payment-toggle-label"
          className={s.switchTrack}
          disabled={isSaving || !canToggleOnsite(summary)}
          onClick={() => toggle(!summary.enabled)}
          data-component="onsite-payment-toggle"
        >
          <span
            className={summary.enabled ? `${s.switchThumb} ${s.switchThumbOn}` : s.switchThumb}
          />
        </button>
      </div>

      {toggleError && (
        <p role="alert" className={s.error} data-component="onsite-payment-toggle-error">
          {t(`errors.${toggleError}`)}
        </p>
      )}

      {debtDate && (
        <p className={s.debt} role="status" data-component="onsite-payment-debt">
          {t('debt', { date: debtDate })}
        </p>
      )}

      <div className={s.methodRow}>
        <p className={s.methodText}>
          {summary.paymentMethodReady ? t('methodReady') : t('methodMissing')}
        </p>
        <Button
          type="button"
          variant={summary.paymentMethodReady ? 'outline' : 'default'}
          size="sm"
          disabled={redirecting}
          onClick={() => void startSetup()}
          data-component="onsite-payment-setup"
        >
          {t(methodButtonKey(summary, redirecting))}
        </Button>
      </div>
      <PlanActionError code={setupError} className={s.error} />

      {(summary.outstandingCommissionCents > 0 || summary.overdueCommissionCents > 0) && (
        <div className={s.amounts} data-component="onsite-payment-amounts">
          {summary.outstandingCommissionCents > 0 && (
            <p>
              {t('outstanding', {
                amount: formatCurrencyFromCents(summary.outstandingCommissionCents, locale),
              })}
            </p>
          )}
          {summary.overdueCommissionCents > 0 && (
            <p>
              {t('overdue', {
                amount: formatCurrencyFromCents(summary.overdueCommissionCents, locale),
              })}
            </p>
          )}
        </div>
      )}
    </section>
  );
}
