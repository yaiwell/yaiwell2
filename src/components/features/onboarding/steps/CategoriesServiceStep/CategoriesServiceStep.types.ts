import type { AppLocale } from '@/i18n/routing';

import type { RootCategory } from '../../shared';

export interface CategoriesServiceValue {
  categoryId: string | undefined;
  serviceName: string;
  serviceDescription: string;
  serviceDurationMinutes: number;
  servicePriceEuros: number;
}

export interface CategoriesServiceStepProps {
  value: CategoriesServiceValue;
  onChange: (patch: Partial<CategoriesServiceValue>) => void;
  categories: RootCategory[];
  locale: AppLocale;
}
