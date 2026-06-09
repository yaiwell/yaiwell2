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
}
