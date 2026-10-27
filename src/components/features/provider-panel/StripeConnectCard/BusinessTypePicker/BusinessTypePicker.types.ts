import type { ConnectBusinessType } from '@/lib/services/payments';

/** Props del selector autónomo / empresa (controlado por el padre). */
export interface BusinessTypePickerProps {
  value: ConnectBusinessType | null;
  onChange: (value: ConnectBusinessType) => void;
  disabled?: boolean;
  /** `id` del mensaje de error para enlazarlo con `aria-describedby`. */
  errorId?: string;
}
