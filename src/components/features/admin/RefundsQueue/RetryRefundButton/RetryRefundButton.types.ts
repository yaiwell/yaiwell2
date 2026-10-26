import type { AppLocale } from '@/i18n/routing';

export interface RetryRefundButtonProps {
  bookingId: string;
  /** Nombre del centro: da contexto al aviso y a la etiqueta accesible. */
  providerName: string;
  locale: AppLocale;
}
