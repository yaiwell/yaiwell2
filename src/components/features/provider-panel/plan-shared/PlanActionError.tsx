import { useTranslations } from 'next-intl';

import type { PlanActionErrorCode } from './plan-shared.types';

/**
 * Aviso del fallo de una action de facturación. `role="alert"` para que
 * el lector de pantalla lo anuncie al aparecer tras pulsar el botón.
 */
export function PlanActionError({
  code,
  className,
}: {
  code: PlanActionErrorCode | null;
  className?: string;
}) {
  const t = useTranslations('providerPanel.plan.errors');
  if (!code) return null;
  return (
    <p role="alert" className={className} data-component="plan-action-error">
      {t(code)}
    </p>
  );
}
