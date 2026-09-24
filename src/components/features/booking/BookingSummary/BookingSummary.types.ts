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
  /**
   * Importe que devuelve el servidor al abrir el checkout, en céntimos.
   *
   * `null` mientras no exista reserva (que es el caso normal la primera
   * vez que se ve este paso): entonces el resumen cae al precio de
   * catálogo del servicio como estimación. El importe que se cobra sale
   * siempre del servidor.
   */
  amountCents: number | null;
  onNotesChange: (notes: string) => void;
}
