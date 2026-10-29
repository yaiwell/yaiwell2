import type { AppLocale } from '@/i18n/routing';

export interface DismissRefundFormProps {
  bookingId: string;
  /** Nombre del centro: da contexto al aviso y a la etiqueta accesible. */
  providerName: string;
  locale: AppLocale;
}
