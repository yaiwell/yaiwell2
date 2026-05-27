/**
 * Cálculos y formato de distancias geográficas.
 *
 * Usamos la fórmula de Haversine, que aproxima la Tierra como una esfera
 * de radio fijo. Para distancias urbanas (<100 km) el error frente a
 * fórmulas geoidales (Vincenty) es despreciable (<0.5%).
 */

/** Radio medio de la Tierra en metros (IUGG). */
const EARTH_RADIUS_METERS = 6_371_000;

/** Convierte grados decimales a radianes. */
function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/**
 * Calcula la distancia geodésica entre dos puntos usando la fórmula
 * de Haversine.
 *
 * Suficiente para distancias urbanas (<100km). No es válida si una de
 * las coordenadas no es finita: en ese caso devolvemos `NaN` para que
 * el caller decida qué mostrar (suele tratarse como "distancia desconocida").
 *
 * @returns distancia en metros, redondeada hacia abajo al entero más cercano.
 */
export function haversineDistance(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  if (
    !Number.isFinite(a.lat) ||
    !Number.isFinite(a.lng) ||
    !Number.isFinite(b.lat) ||
    !Number.isFinite(b.lng)
  ) {
    return Number.NaN;
  }

  const lat1 = toRadians(a.lat);
  const lat2 = toRadians(b.lat);
  const deltaLat = toRadians(b.lat - a.lat);
  const deltaLng = toRadians(b.lng - a.lng);

  // Fórmula de Haversine estándar.
  const sinDLat = Math.sin(deltaLat / 2);
  const sinDLng = Math.sin(deltaLng / 2);
  const h = sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLng * sinDLng;
  const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));

  return Math.floor(EARTH_RADIUS_METERS * c);
}

/**
 * Formatea una distancia en metros a string localizado.
 *
 *  - <1000m → entero + " m" (ej. "350 m").
 *  - >=1000m → kilómetros con 1 decimal (ej. "1,2 km" en es/ca con coma).
 *
 * Usamos `Intl.NumberFormat` con el locale recibido para que el separador
 * decimal sea el correcto del idioma (coma en es/ca, punto en en, etc.).
 *
 * @param meters — distancia en metros (puede ser NaN si no se conoce).
 * @param locale — locale BCP-47 (`es`, `ca`, `en`...) o variantes con región.
 * @returns string ya formateado para mostrar al usuario.
 */
export function formatDistance(meters: number, locale: 'es' | 'ca' | string): string {
  if (!Number.isFinite(meters) || meters < 0) {
    // Devolvemos un guion largo para señalar "desconocido" sin romper layout.
    return '—';
  }

  if (meters < 1000) {
    // Para metros redondeamos al entero más cercano (los decimales no
    // aportan precisión real dado el ruido del GPS urbano).
    const rounded = Math.round(meters);
    return `${rounded} m`;
  }

  // Por encima de 1 km mostramos un decimal para que la diferencia entre
  // "1,2 km" y "1,9 km" sea percibida por el usuario.
  const km = meters / 1000;
  const formatter = new Intl.NumberFormat(locale, {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
  return `${formatter.format(km)} km`;
}
