import type { PriceRange, ProviderWithAvailability } from '@/types/domain';

/** Filtros que viajan en la URL y que el server aplica en la búsqueda. */
export interface SearchFilters {
  query: string;
  categorySlug: string | null;
  availabilityOnly: boolean;
  priceRange: PriceRange[];
  minRating: number | null;
}

/**
 * Estado completo codificado en la URL de `/buscar`.
 *
 * `nearMeOnly` va aparte de `SearchFilters` porque no lo aplica el
 * server (se filtra en cliente por distancia), pero debe viajar en la
 * URL igualmente para que "Cerca de ti" sea compartible y recargable.
 */
export interface SearchUrlState extends SearchFilters {
  nearMeOnly: boolean;
}

/**
 * Categoría ya resuelta al locale activo, lista para pintar.
 *
 * La page la construye en servidor a partir de la BD y la pasa como
 * dato plano: el cliente nunca importa Prisma ni el árbol completo.
 */
export interface SearchCategoryOption {
  id: string;
  slug: string;
  label: string;
}

/** Categorías que necesita el buscador en cliente. */
export interface SearchCategoriesData {
  /** Categorías raíz, en el orden en que se pintan los chips. */
  roots: SearchCategoryOption[];
  /**
   * Etiqueta de la categoría activa (`?cat=`), que puede ser una raíz o
   * una subcategoría (p. ej. `manicura-pedicura` desde la landing).
   * `null` si no hay filtro o el slug no existe en BD.
   */
  activeLabel: string | null;
}

/**
 * Snapshot inicial calculado server-side por la page.
 *
 * Lo pasamos al orquestador para evitar hidratación inconsistente:
 * el primer pintado coincide exactamente con el SSR.
 */
export interface SearchViewInitialState {
  providers: ProviderWithAvailability[];
  fromPriceMap: Record<string, number | null>;
  filters: SearchFilters;
  /**
   * Activa el filtro "Cerca de ti" al hidratar.
   * Lo seteamos cuando el usuario llega desde el Hero con `?near=me`.
   */
  nearMeOnly?: boolean;
}

export interface SearchViewProps {
  initial: SearchViewInitialState;
  /** Categorías de la BD, resueltas al locale en servidor. */
  categories: SearchCategoriesData;
}

/**
 * Pestañas activas en la vista móvil. En desktop son simultáneas
 * (split-screen), así que este estado solo afecta a la versión móvil.
 */
export type MobileTab = 'list' | 'map';

/**
 * Proveedor enriquecido en cliente con la distancia REAL al usuario.
 *
 * La distancia que viene del server (`distanceKm`) se calcula respecto
 * al `userLocation` que se pasara a `searchProviders`, pero hoy la page
 * no le pasa nada — solo conoce la cookie en SSR (que es opcional). Por
 * eso el cliente recalcula `distanceMeters` aquí en cuanto el provider
 * `useUserLocation` ya tiene una posición disponible (real o fallback).
 */
export interface ProviderWithDistance extends ProviderWithAvailability {
  /** Distancia al usuario en metros. NaN si no se puede calcular. */
  distanceMeters: number;
}
