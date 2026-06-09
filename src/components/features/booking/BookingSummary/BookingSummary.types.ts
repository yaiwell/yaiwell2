import type { Provider, Service } from '@/types/domain';

/**
 * Props del paso "Confirmar datos" del flujo de reserva.
 *
 * Recibe los datos del proveedor y servicio ya resueltos y el slot
 * elegido (en formato ISO) para que el resumen sea autocontenido y
 * pueda probarse de forma aislada.
 */
export interface BookingSummaryProps {
  provider: Provider;
  service: Service;
  locale: 'es' | 'ca' | 'en' | 'de';
  slotStartIso: string;
  slotEndIso: string;
  notes: string;
  onNotesChange: (notes: string) => void;
}
