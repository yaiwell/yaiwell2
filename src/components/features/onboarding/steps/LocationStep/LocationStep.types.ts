import type { AppLocale } from '@/i18n/routing';

export interface LocationStepValue {
  address: string;
  lat: number | undefined;
  lng: number | undefined;
}

export interface LocationStepProps {
  value: LocationStepValue;
  onChange: (patch: Partial<LocationStepValue>) => void;
  locale: AppLocale;
}
