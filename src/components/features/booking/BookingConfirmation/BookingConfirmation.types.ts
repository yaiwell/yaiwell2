import type { Provider, Service } from '@/types/domain';

/**
 * Props del paso final de confirmación.
 *
 * Recibe todos los datos relevantes ya resueltos por el orquestador para
 * que esta pantalla pueda ser un Server Component si se reutiliza desde
 * una página de detalle de reserva en el futuro.
 */
export interface BookingConfirmationProps {
  provider: Provider;
  service: Service;
  locale: 'es' | 'ca' | 'en' | 'de';
  slotStartIso: string;
  slotEndIso: string;
  bookingId: string;
  /** Segmento `{slug}-{id}` del proveedor para el enlace de vuelta. */
  providerSlugWithId: string;
  /**
   * Importe realmente cobrado, en céntimos, tal y como lo devuelve el
   * servidor (`Booking.priceCents` o el `amountCents` del checkout).
   *
   * No se deriva de `service.priceCents`: ese es el precio de catálogo
   * que tiene el navegador y puede diferir del que se congeló al crear
   * la reserva.
   */
  amountCents: number;
  /**
   * `true` cuando el cargo aún no ha terminado de liquidarse (la reserva
   * sigue en `pending` porque el webhook de Stripe no ha llegado).
   * Cambia el copy para no prometer una confirmación que todavía no es.
   */
  paymentPending?: boolean;
}
