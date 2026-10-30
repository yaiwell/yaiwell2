import type { AppLocale } from '@/i18n/routing';
import type { OnsiteBillingSummary } from '@/lib/services/billing';

/**
 * Tipos de la tarjeta «Cobro en el local» de `/panel/plan`.
 * `OnsiteBillingSummary` se importa solo como tipo: el barrel de
 * `billing` arrastra Stripe y Prisma.
 */

export interface OnsitePaymentCardProps {
  summary: OnsiteBillingSummary;
  locale: AppLocale;
}

/** Estado que la tarjeta cuenta en una línea. */
export type OnsiteCardStatus = 'on' | 'off' | 'suspended';

/** Claves de `providerPanel.plan.onsite.errors` del interruptor. */
export type OnsiteToggleErrorKey = 'paymentMethodMissing' | 'commissionDebt' | 'generic';
