import type { PriceRange } from '@/types/domain';

import type { SearchUrlState } from './SearchView.types';

/**
 * Serialización de la URL de `/buscar` en ambos sentidos.
 *
 * Vive aparte del hook porque la usan dos mundos: la page (Server
 * Component) para parsear los `searchParams` y el cliente para
 * construir la siguiente URL. Por eso este archivo NO lleva
 * `'use client'` ni importa nada de servidor: son funciones puras.
 *
 * Tener parse y build juntos permite un test de ida y vuelta que
 * garantiza que ningún filtro se pierde al navegar (como pasó con
 * `near=me`, que se leía pero nunca se volvía a escribir).
 */

/** Rangos de precio válidos; cualquier otro valor en la URL se ignora. */
const ALLOWED_PRICE_RANGES: readonly PriceRange[] = ['€', '€€', '€€€'];

/** Forma de los `searchParams` tal y como los entrega Next.js. */
export type RawSearchParams = Record<string, string | string[] | undefined>;

/**
 * Convierte los `searchParams` (siempre strings) al estado tipado del
 * buscador. Los valores inválidos caen al predeterminado en vez de
 * romper: una URL compartida mal copiada debe seguir abriendo algo.
 *
 * @param sp — `searchParams` ya resueltos de la page.
 * @returns el estado completo del buscador codificado en la URL.
 */
export function parseSearchParams(sp: RawSearchParams): SearchUrlState {
  const query = typeof sp.q === 'string' ? sp.q : '';
  const categorySlug = typeof sp.cat === 'string' && sp.cat.length > 0 ? sp.cat : null;
  const minRating = typeof sp.rating === 'string' ? Number(sp.rating) : NaN;
  const priceRaw = typeof sp.price === 'string' ? sp.price : '';
  const priceRange = priceRaw
    .split(',')
    .map((s) => s.trim())
    .filter((s): s is PriceRange => ALLOWED_PRICE_RANGES.includes(s as PriceRange));

  return {
    query,
    categorySlug,
    availabilityOnly: sp.now === '1' || sp.now === 'true',
    priceRange,
    // `Number('')` es 0, pero solo llega aquí si `rating` existe; aun
    // así filtramos NaN/Infinity para no inventar un filtro.
    minRating: Number.isFinite(minRating) ? minRating : null,
    // `near=me` lo emite el Hero ("Usar mi ubicación") y el propio chip
    // "Cerca de ti" para que el estado sea compartible y recargable.
    nearMeOnly: sp.near === 'me',
  };
}

/**
 * Construye el querystring de búsqueda a partir del estado activo.
 *
 * Estrategia "URL as state": cada cambio dispara una navegación que
 * re-renderiza la page server-side con los nuevos `searchParams`, y
 * next-intl mantiene el locale automáticamente.
 *
 * Mantenemos compacto el querystring: omitimos claves cuyos valores
 * son los predeterminados (sin texto, sin categoría, sin "ahora", etc.).
 *
 * @param state — filtros + toggle "Cerca de ti".
 * @returns `?a=b&…` o `''` si no hay nada que codificar.
 */
export function buildSearchParams(state: SearchUrlState): string {
  const params = new URLSearchParams();
  if (state.query) params.set('q', state.query);
  if (state.categorySlug) params.set('cat', state.categorySlug);
  if (state.availabilityOnly) params.set('now', '1');
  if (state.priceRange.length > 0) params.set('price', state.priceRange.join(','));
  if (state.minRating !== null) params.set('rating', String(state.minRating));
  if (state.nearMeOnly) params.set('near', 'me');
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}
