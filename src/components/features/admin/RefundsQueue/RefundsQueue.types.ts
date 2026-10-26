import type { AppLocale } from '@/i18n/routing';
import type { PendingRefundSummary } from '@/lib/services/checkout';

export interface RefundsQueueProps {
  /** Reembolsos fallidos pendientes, los más antiguos primero. */
  refunds: PendingRefundSummary[];
  /** Locale activo: lo necesitan los formateadores y la server action. */
  locale: AppLocale;
}

export interface RefundsQueueItemProps {
  refund: PendingRefundSummary;
  locale: AppLocale;
}
