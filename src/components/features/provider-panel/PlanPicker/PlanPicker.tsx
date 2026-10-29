'use client';

import { Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { cn } from '@/lib/utils';
import { isLiveSubscriptionStatus } from '@/lib/utils/plan-billing';

import { PlanActionError, planSharedStyles as shared } from '../plan-shared';

import { PlanCard } from './PlanCard';
import { ctaActionKey, getPlanCta, hasScheduledChange, isActionableCta } from './PlanPicker.logic';
import { planPickerStyles as s } from './PlanPicker.styles';
import type { PlanPickerProps } from './PlanPicker.types';
import { usePlanPicker } from './usePlanPicker';

/**
 * Selector de planes de `/panel/plan`: las 4 tarjetas con la CTA que
 * decide `getPlanCta` (contratar, cambiar, pasar a Gratis…). Los cambios
 * se confirman en Stripe; el plan cambia cuando llega el webhook.
 */
export function PlanPicker({ plans, summary, locale, preselectedTier = null }: PlanPickerProps) {
  const t = useTranslations('providerPanel.plan');
  const { pendingKey, isBusy, errorCode, handleCta } = usePlanPicker(locale);

  const currentTier = summary.plan.tier;
  const live = isLiveSubscriptionStatus(summary.subscriptionStatus);
  const schedule = {
    scheduledTier: summary.scheduledTier,
    cancelAtPeriodEnd: summary.cancelAtPeriodEnd,
  };
  const locked = live && hasScheduledChange(currentTier, schedule);

  return (
    <section className={s.root} aria-labelledby="plan-picker-title" data-component="plan-picker">
      <header className={s.header}>
        <h2 id="plan-picker-title" className={s.title}>
          {t('picker.title')}
        </h2>
        <p className={s.subtitle}>{t('picker.subtitle')}</p>
      </header>

      <PlanActionError code={errorCode} className={shared.errorNotice} />

      <div className={s.grid}>
        {plans.map((plan) => {
          const kind = getPlanCta(
            currentTier,
            plan.tier,
            summary.subscriptionStatus,
            live,
            schedule,
          );
          const isCurrent = kind === 'current';
          const actionable = isActionableCta(kind);
          const isPending = pendingKey !== null && pendingKey === ctaActionKey(kind, plan.tier);
          const planName = t(`tierNames.${plan.tier}`);
          const emphasis = isCurrent
            ? 'current'
            : preselectedTier === plan.tier
              ? 'selected'
              : 'none';

          return (
            <PlanCard
              key={plan.tier}
              plan={plan}
              locale={locale}
              emphasis={emphasis}
              badge={isCurrent ? t('card.currentBadge') : null}
              footer={
                <div className={s.ctaRow}>
                  <button
                    type="button"
                    className={cn(
                      kind === 'downgrade_free' || !actionable
                        ? shared.secondaryCta
                        : shared.primaryCta,
                      s.ctaFull,
                    )}
                    disabled={!actionable || isBusy}
                    aria-busy={isPending}
                    onClick={() => void handleCta(kind, plan.tier)}
                    data-component={`plan-cta-${plan.tier}`}
                    data-cta={kind}
                  >
                    {isPending ? <Loader2 className={shared.spinner} aria-hidden /> : null}
                    {isPending ? t('cta.loading') : t(`cta.${kind}`, { plan: planName })}
                  </button>
                </div>
              }
            />
          );
        })}
      </div>

      <p className={s.hint}>{locked ? t('picker.lockedHint') : t('picker.stripeHint')}</p>
    </section>
  );
}
