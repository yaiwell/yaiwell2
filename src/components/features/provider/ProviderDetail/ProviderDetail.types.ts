/**
 * Tipos específicos del componente compositor `ProviderDetail`.
 *
 * El detalle del proveedor llega ya ensamblado desde el service
 * (`getProviderDetail`); la página enriquece adicionalmente el
 * `provider` con disponibilidad antes de pasárnoslo, para que el
 * `ProviderHeader` muestre el badge "disponible ahora" sin tener
 * que cruzar capas desde aquí.
 */
import type { ProviderWithAvailability, Review, Service } from '@/types/domain';
import type { RatingBreakdown } from '@/lib/services/providers';

export interface ProviderDetailProps {
  provider: ProviderWithAvailability;
  services: Service[];
  reviews: Review[];
  ratingBreakdown: RatingBreakdown;
  locale: 'es' | 'ca';
}
