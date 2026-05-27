import type { PriceRange } from '@/types/domain';

/**
 * Tipo de filtro identificable como chip individual.
 *
 * Mantenemos un discriminated union para que el componente sepa qué
 * texto pintar y qué acción ejecutar al eliminar cada uno.
 */
export type ActiveFilterChip =
  | { kind: 'query'; value: string }
  | { kind: 'category'; slug: string; label: string }
  | { kind: 'availability' }
  | { kind: 'price'; value: PriceRange }
  | { kind: 'rating'; value: number };

/**
 * Forma global de los filtros activos del buscador. Es un subset del
 * `SearchViewInitialState['filters']` para no depender de ese tipo
 * privado de la feature.
 */
export interface ActiveFiltersState {
  query: string;
  categorySlug: string | null;
  availabilityOnly: boolean;
  priceRange: PriceRange[];
  minRating: number | null;
}

export interface ActiveFiltersChipsProps {
  /** Estado actual de los filtros. */
  filters: ActiveFiltersState;
  /** Etiqueta visible de la categoría activa (resuelta por el caller con i18n). */
  categoryLabel: string | null;
  /** Quita un chip concreto. El caller actualiza la URL/estado. */
  onRemove: (chip: ActiveFilterChip) => void;
  /** Limpia todos los filtros de golpe. Solo se muestra el botón si hay >1 chip. */
  onClearAll: () => void;
}
