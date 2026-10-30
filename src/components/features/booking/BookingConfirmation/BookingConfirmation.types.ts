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
   * Precio de referencia congelado en la reserva si era un hueco
   * liberado con descuento; `null`/ausente sin descuento. Se pinta
   * tachado junto a `amountCents`.
   */
  originalPriceCents?: number | null;
  /** % de descuento congelado en la reserva; `null`/ausente sin descuento. */
  discountPct?: number | null;
  /**
   * `true` cuando el cargo aún no ha terminado de liquidarse (la reserva
   * sigue en `pending` porque el webhook de Stripe no ha llegado).
   * Cambia el copy para no prometer una confirmación que todavía no es.
   */
  paymentPending?: boolean;
  /**
   * `onsite`: reserva con pago en el local (§4.bis). No hubo cobro: el
   * copy dice cuánto se pagará en el negocio en vez de «total».
   */
  paymentMode?: 'online' | 'onsite';
}
