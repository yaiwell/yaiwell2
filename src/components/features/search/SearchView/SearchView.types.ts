import type { PriceRange, ProviderWithAvailability } from '@/types/domain';

/**
 * Snapshot inicial calculado server-side por la page.
 *
 * Lo pasamos al orquestador para evitar hidratación inconsistente:
 * el primer pintado coincide exactamente con el SSR.
 */
export interface SearchViewInitialState {
  providers: ProviderWithAvailability[];
  fromPriceMap: Record<string, number | null>;
  filters: {
    query: string;
    categorySlug: string | null;
    availabilityOnly: boolean;
    priceRange: PriceRange[];
    minRating: number | null;
  };
}

export interface SearchViewProps {
  initial: SearchViewInitialState;
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
