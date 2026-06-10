import type { PriceRangeChoice } from '../../shared';

/**
 * Estado del campo `slug` para la UI: idle (no comprobado), checking
 * (request en vuelo), available (libre), taken (ocupado), invalid
 * (no cumple el regex SLUG_REGEX).
 */
export type SlugStatus = 'idle' | 'checking' | 'available' | 'taken' | 'invalid';

/**
 * Forma de los datos que el paso 2 expone hacia el orquestador. Se
 * mantienen en el draft del wizard.
 */
export interface BusinessDataValue {
  businessName: string;
  slug: string;
  vatNumber: string;
  description: string;
  priceRange: PriceRangeChoice | undefined;
}

export interface BusinessDataStepProps {
  value: BusinessDataValue;
  onChange: (patch: Partial<BusinessDataValue>) => void;
  /**
   * Estado del slug controlado por el orquestador. El paso 2 lo refleja
   * pero no lo gestiona — la comprobación remota la dispara la logic.
   */
  slugStatus: SlugStatus;
  onSlugStatusChange: (status: SlugStatus) => void;
  /** Error externo (p. ej. SLUG_ALREADY_TAKEN tras el submit). */
  externalError?: string;
}
