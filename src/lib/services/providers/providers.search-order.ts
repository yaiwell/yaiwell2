import { hasPublicRating } from '@/lib/utils/rating';
import type { ProviderWithAvailability } from '@/types/domain';

/**
 * Nota efectiva para ordenar: un centro sin reseñas cuenta como 0
 * aunque la caché arrastre una media antigua, con la misma regla que
 * decide «Nuevo en Yaiwell» en la UI.
 */
function effectiveRating(p: ProviderWithAvailability): { avg: number; count: number } {
  return hasPublicRating(p.rating, p.reviewsCount)
    ? { avg: p.rating, count: p.reviewsCount }
    : { avg: 0, count: 0 };
}

/**
 * Comparador de resultados de `/buscar`.
 *
 * 1. Con ubicación del usuario: distancia ascendente.
 * 2. Nota descendente y, en empate, número de reseñas.
 * 3. Desempate explícito por nombre y, por último, por id.
 *
 * El punto 3 existe porque hoy casi todos los centros empatan a 0/0 (aún
 * no hay reseñas) y dos centros en el mismo edificio empatan en
 * distancia: sin él, el orden dependía del que devolviera Postgres y la
 * lista podía «bailar» entre recargas.
 *
 * @param hasUserLocation — si la búsqueda trae la ubicación del usuario.
 * @returns comparador para `Array.prototype.sort`.
 */
export function compareSearchResults(hasUserLocation: boolean) {
  return (a: ProviderWithAvailability, b: ProviderWithAvailability): number => {
    if (hasUserLocation && a.distanceKm !== null && b.distanceKm !== null) {
      if (a.distanceKm !== b.distanceKm) return a.distanceKm - b.distanceKm;
    }

    const ra = effectiveRating(a);
    const rb = effectiveRating(b);
    if (rb.avg !== ra.avg) return rb.avg - ra.avg;
    if (rb.count !== ra.count) return rb.count - ra.count;

    // `localeCompare` con locale fijo: el orden no depende del idioma
    // del servidor.
    const byName = a.name.localeCompare(b.name, 'es');
    if (byName !== 0) return byName;
    if (a.id === b.id) return 0;
    return a.id < b.id ? -1 : 1;
  };
}
