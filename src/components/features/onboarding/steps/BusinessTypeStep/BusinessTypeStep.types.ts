import type { BusinessType } from '../../shared';

export interface BusinessTypeStepProps {
  value: BusinessType | undefined;
  onChange: (value: BusinessType) => void;
}
