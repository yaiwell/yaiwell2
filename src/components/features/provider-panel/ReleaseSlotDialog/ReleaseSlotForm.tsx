'use client';

import { CheckCircle2, Minus, Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Dialog } from 'radix-ui';

import { Button } from '@/components/ui/button';
import { MAX_SLOT_OFFER_DISCOUNT_PCT } from '@/lib/utils/slot-offer-pricing';

import { bookingActionDialogStyles as d } from '../BookingActionsList/BookingActionsList.styles';
import { getTierMin, useReleaseSlotForm } from './ReleaseSlotDialog.logic';
import { releaseSlotStyles as s } from './ReleaseSlotDialog.styles';
import type { ReleaseSlotFormProps } from './ReleaseSlotDialog.types';

/**
 * Contenido del diálogo: tramos con su selector, validación en vivo y
 * envío. Tras publicar, muestra la confirmación en el mismo sitio.
 *
 * Tono sereno: se explica cómo baja el precio, sin urgencias ni
 * contadores (CLAUDE.md, nada de dark patterns).
 */
export function ReleaseSlotForm({ locale, request, onClose }: ReleaseSlotFormProps) {
  const t = useTranslations('providerPanel.calendar.slotOffers');
  const { target, notice } = request;
  const { tiers, discounts, currentTier, issue, errorKey, done, isPending, step, submit } =
    useReleaseSlotForm(target, locale);

  if (done) {
    return (
      <div className={s.success} data-component="release-slot-success">
        <CheckCircle2 className={s.successIcon} aria-hidden />
        <Dialog.Title className={d.title}>{t('successTitle')}</Dialog.Title>
        <Dialog.Description className={d.description}>{t('successDescription')}</Dialog.Description>
        <div className={d.actions}>
          <Button type="button" size="sm" onClick={onClose}>
            {t('close')}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className={s.header}>
        <Dialog.Title className={d.title}>
          {target.kind === 'cancelled' ? t('releaseTitle') : t('releaseFreeTitle')}
        </Dialog.Title>
        {target.kind === 'free' && (
          <p className={s.subtitle}>
            {t('releaseFreeSubtitle', { service: target.serviceName, time: target.startTime })}
          </p>
        )}
      </div>

      {notice === 'refundFailed' && (
        <p className={s.notice} data-component="release-slot-refund-notice">
          {t('refundFailedNotice')}
        </p>
      )}

      <Dialog.Description className={d.description}>{t('description')}</Dialog.Description>

      <div className={s.tiers} role="group" aria-label={t('tiersLabel')}>
        {tiers.map((tier) => {
          const label = t(`tiers.${tier}`);
          const isCurrent = tier === currentTier;
          return (
            <div
              key={tier}
              className={`${s.tierRow} ${isCurrent ? s.tierRowCurrent : ''}`}
              data-component={`release-slot-tier-${tier}`}
            >
              <span className={s.tierLabel}>
                {label}
                {isCurrent && <span className={s.tierNow}>{t('tierNow')}</span>}
              </span>
              <div className={s.stepper}>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className={s.stepperButton}
                  aria-label={t('decrease', { tier: label })}
                  disabled={isPending || discounts[tier] <= getTierMin(tier)}
                  onClick={() => step(tier, -1)}
                >
                  <Minus className={s.stepperIcon} aria-hidden />
                </Button>
                <output className={s.stepperValue}>{t('pct', { pct: discounts[tier] })}</output>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className={s.stepperButton}
                  aria-label={t('increase', { tier: label })}
                  disabled={isPending || discounts[tier] >= MAX_SLOT_OFFER_DISCOUNT_PCT}
                  onClick={() => step(tier, 1)}
                >
                  <Plus className={s.stepperIcon} aria-hidden />
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      <p className={s.rules}>{t('rules', { max: MAX_SLOT_OFFER_DISCOUNT_PCT })}</p>

      {issue && (
        <p className={s.issue} role="status" data-component="release-slot-issue">
          {t(`issues.${issue}`)}
        </p>
      )}

      {errorKey && (
        <p role="alert" className={d.errorBanner} data-component="release-slot-error">
          {t(`errors.${errorKey}`)}
        </p>
      )}

      <div className={d.actions}>
        <Button type="button" variant="outline" size="sm" disabled={isPending} onClick={onClose}>
          {t('skip')}
        </Button>
        <Button
          type="button"
          size="sm"
          disabled={isPending || issue !== null}
          onClick={submit}
          data-component="release-slot-submit"
        >
          {isPending ? t('pending') : t('submit')}
        </Button>
      </div>
    </>
  );
}
