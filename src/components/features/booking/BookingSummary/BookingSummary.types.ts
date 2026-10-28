import type { Provider, Service } from '@/types/domain';

import type { DisplayedBookingPrice } from '../DiscountedPrice';

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
   * Importe a mostrar, ya resuelto por el flujo.
   *
   * Mientras no exista reserva (el caso normal la primera vez que se ve
   * este paso) es una previsión: el precio del hueco elegido, con su
   * descuento si lo tenía, o el de catálogo. El resumen lo rotula como
   * «precio previsto» cuando hay descuento. El importe que se cobra sale
   * siempre del servidor.
   */
  price: DisplayedBookingPrice;
  /**
   * `true` si el hueco empieza en menos de 2 h (reserva de última hora):
   * el resumen sustituye la política de "cancela gratis" por la de
   * última hora (se paga ahora, sin cancelación ni reembolso).
   */
  isLastMinute: boolean;
  onNotesChange: (notes: string) => void;
}
