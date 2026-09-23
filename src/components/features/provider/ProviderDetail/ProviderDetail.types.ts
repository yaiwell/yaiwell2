/**
 * Tipos específicos del componente compositor `ProviderDetail`.
 *
 * El detalle del proveedor llega ya ensamblado desde el service
 * (`getProviderDetail`); la página enriquece adicionalmente el
 * `provider` con disponibilidad antes de pasárnoslo, para que el
 * `ProviderHeader` muestre el badge "disponible ahora" sin tener
 * que cruzar capas desde aquí.
 */
import type { WeeklySchedule } from '@/lib/services/availability';
import type { RatingBreakdown } from '@/lib/services/providers';
import type { ProviderWithAvailability, Review, ServiceWithRootCategory } from '@/types/domain';

export interface ProviderDetailProps {
  provider: ProviderWithAvailability;
  /** Catálogo con la categoría raíz ya resuelta en servidor. */
  services: ServiceWithRootCategory[];
  reviews: Review[];
  ratingBreakdown: RatingBreakdown;
  /** Horario real del provider o `null` si no se pudo cargar. */
  schedule: WeeklySchedule | null;
  locale: 'es' | 'ca' | 'en' | 'de';
}
