import type { AppLocale } from '@/i18n/routing';
import type { UnfinishedIncidentRefund } from '@/lib/services/checkout';

export interface IncidentRefundPanelProps {
  locale: AppLocale;
}

export interface UnfinishedIncidentRefundsProps {
  /** Reembolsos a medias, los más antiguos primero. */
  refunds: UnfinishedIncidentRefund[];
  locale: AppLocale;
}
