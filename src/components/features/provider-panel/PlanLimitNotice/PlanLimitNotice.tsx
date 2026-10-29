import { ArrowUpRight } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Link } from '@/i18n/navigation';

import { planLimitNoticeStyles as s } from './PlanLimitNotice.styles';

/**
 * Aviso de «has llegado al límite de servicios de tu plan» con enlace a
 * `/panel/plan` para mejorarlo.
 *
 * Sin estado ni hooks de navegador: se usa igual desde el listado
 * (Server Component) que desde el formulario y el botón de reactivar
 * (Client Components).
 */
export function PlanLimitNotice() {
  const t = useTranslations('providerPanel.services.planLimit');

  return (
    <div role="status" className={s.root} data-component="plan-limit-notice">
      <p className={s.message}>{t('reached')}</p>
      <Link href="/panel/plan" className={s.cta} data-component="plan-limit-upgrade-link">
        {t('upgradeCta')}
        <ArrowUpRight className={s.ctaIcon} aria-hidden />
      </Link>
    </div>
  );
}
