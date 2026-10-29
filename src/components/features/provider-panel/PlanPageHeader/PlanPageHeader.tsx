import { useTranslations } from 'next-intl';

import { planPageHeaderStyles as s } from './PlanPageHeader.styles';
import type { PlanPageHeaderProps } from './PlanPageHeader.types';

/**
 * Cabecera de `/panel/plan` con el aviso de la vuelta de Stripe cuando
 * el pago se canceló o no se pudo abrir (desde el onboarding).
 *
 * Sin estado: Server Component.
 */
export function PlanPageHeader({ notice = null, noticePlan = null }: PlanPageHeaderProps) {
  const t = useTranslations('providerPanel.plan');
  const plan = noticePlan ? t(`tierNames.${noticePlan}`) : '';

  return (
    <header className={s.root}>
      <h1 className={s.title}>{t('title')}</h1>
      <p className={s.subtitle}>{t('subtitle')}</p>
      {notice ? (
        <p
          role="status"
          className={notice === 'checkoutCancelled' ? s.noticeInfo : s.noticeWarning}
          data-component="plan-page-notice"
          data-notice={notice}
        >
          {t(`notices.${notice}`, { plan })}
        </p>
      ) : null}
    </header>
  );
}
