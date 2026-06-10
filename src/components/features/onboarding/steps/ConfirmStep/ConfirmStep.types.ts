import type { AppLocale } from '@/i18n/routing';

import type { BusinessType, PriceRangeChoice, RootCategory } from '../../shared';

/**
 * Vista resumen — solo lectura. El orquestador pasa los datos finales
 * tal y como se enviarán al backend (en sus unidades naturales: euros
 * para el usuario, no céntimos).
 */
export interface ConfirmStepSummary {
  type: BusinessType;
  businessName: string;
  slug: string;
  vatNumber?: string;
  description: string;
  priceRange: PriceRangeChoice;
  address: string;
  categoryId: string;
  serviceName: string;
  serviceDurationMinutes: number;
  servicePriceEuros: number;
}

export interface ConfirmStepProps {
  summary: ConfirmStepSummary;
  categories: RootCategory[];
  locale: AppLocale;
  termsAccepted: boolean;
  onTermsChange: (accepted: boolean) => void;
}
