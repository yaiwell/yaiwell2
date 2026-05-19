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
