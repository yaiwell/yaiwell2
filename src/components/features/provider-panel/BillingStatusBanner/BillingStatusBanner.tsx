'use client';

import { ArrowUpRight, Loader2 } from 'lucide-react';
import { useFormatter, useTranslations } from 'next-intl';

import { Link } from '@/i18n/navigation';
import { PANEL_TIMEZONE } from '@/lib/utils/madrid-week';

import {
  PlanActionError,
  planSharedStyles as shared,
  portalActionKey,
  usePlanBillingActions,
} from '../plan-shared';

import { BANNER_CTA_KEYS, BANNER_ICONS, resolveBillingBanner } from './BillingStatusBanner.logic';
import { billingStatusBanner, billingStatusBannerStyles as s } from './BillingStatusBanner.styles';
import type { BillingStatusBannerProps } from './BillingStatusBanner.types';
import { useCheckoutActivation } from './useCheckoutActivation';

/**
 * Aviso del estado de facturación del plan (cobro fallido, pago por
 * confirmar, plan activándose, cancelación o bajada programadas). Si no
 * hay nada relevante no pinta nada.
 *
 * `aria-live` para que el cambio «Activando…» → «Activado» se anuncie
 * sin mover el foco; el cobro fallido va como `alert`.
 */
export function BillingStatusBanner({
  summary,
  locale,
  checkoutState = null,
  showPlanLink = false,
}: BillingStatusBannerProps) {
  const t = useTranslations('providerPanel.plan');
  const format = useFormatter();
  const view = resolveBillingBanner(summary, checkoutState);
  const timedOut = useCheckoutActivation(view?.variant === 'activating');
  const { pendingKey, isBusy, errorCode, openPortal } = usePlanBillingActions(locale);

  if (!view) return null;

  const Icon = BANNER_ICONS[view.variant];
  const values = {
    plan: t(`tierNames.${view.tier}`),
    date: view.date
      ? format.dateTime(view.date, { dateStyle: 'long', timeZone: PANEL_TIMEZONE })
      : '',
  };
  const intent = view.portalIntent;
  const isPending = intent !== null && pendingKey === portalActionKey(intent);

  return (
    <div
      role={view.tone === 'error' ? 'alert' : 'status'}
      aria-live={view.tone === 'error' ? 'assertive' : 'polite'}
      className={billingStatusBanner({ tone: view.tone })}
      data-component="billing-status-banner"
      data-variant={view.variant}
    >
      <div className={s.content}>
        <Icon
          className={view.variant === 'activating' && !timedOut ? s.iconSpin : s.icon}
          aria-hidden
        />
        <div className={s.text}>
          <p className={s.title}>{t(`banner.${view.variant}.title`, values)}</p>
          <p className={s.body}>
            {view.variant === 'activating' && timedOut
              ? t('banner.activating.slowBody')
              : t(`banner.${view.variant}.body`, values)}
          </p>
        </div>
      </div>

      <div className={s.actions}>
        {intent ? (
          <button
            type="button"
            className={shared.secondaryCta}
            disabled={isBusy}
            aria-busy={isPending}
            onClick={() => void openPortal(intent)}
            data-component="billing-status-banner-cta"
          >
            {isPending ? <Loader2 className={shared.spinner} aria-hidden /> : null}
            {isPending ? t('cta.loading') : t(BANNER_CTA_KEYS[view.variant] ?? 'banner.viewPlan')}
          </button>
        ) : null}
        {showPlanLink ? (
          <Link href="/panel/plan" className={s.link} data-component="billing-status-banner-link">
            {t('banner.viewPlan')}
            <ArrowUpRight className={s.linkIcon} aria-hidden />
          </Link>
        ) : null}
      </div>

      <PlanActionError code={errorCode} className={s.error} />
    </div>
  );
}
