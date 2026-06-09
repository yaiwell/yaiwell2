/**
 * Tipos de la integración Mapbox.
 *
 * Estos tipos son **agnósticos al proveedor**: si mañana migramos a
 * Google Geocoding, MapTiler o Pelias, el contorno público de
 * `geocodeAddress` / `reverseGeocode` no cambia y la app no se entera.
 *
 * Por eso `GeocodingResult` aplana el shape GeoJSON de Mapbox a algo
 * que la UI puede consumir directamente (`{lat, lng}` en lugar del
 * `[lng, lat]` invertido que devuelve la API).
 */

/**
 * Tipos de feature que la Geocoding API v6 devuelve, de mayor a menor
 * granularidad. Lo exponemos para que la UI pueda filtrar (e.g., en
 * un picker de ciudad mostraríamos solo `place`/`locality`).
 */
export type GeocodingFeatureKind =
  | 'country'
  | 'region'
  | 'postcode'
  | 'district'
  | 'place'
  | 'locality'
  | 'neighborhood'
  | 'street'
  | 'address';

/**
 * Un candidato de geocoding listo para consumir por la UI.
 *
 * - `name`: forma corta legible ("Barcelona", "Carrer d'Aragó 256").
 * - `fullAddress`: dirección completa para listar en sugerencias.
 * - `lat` / `lng`: WGS84 en grados decimales (no `[lng, lat]` de GeoJSON).
 * - `kind`: granularidad — útil para filtrar en pickers.
 */
export interface GeocodingResult {
  id: string;
  name: string;
  fullAddress: string;
  lat: number;
  lng: number;
  kind: GeocodingFeatureKind;
}

/**
 * Opciones para `geocodeAddress` (texto → coordenadas).
 *
 * - `language`: IETF tag, e.g., `'es'`, `'ca'`. Sin valor, Mapbox elige
 *   por el `Accept-Language` o cae a inglés.
 * - `country`: filtro ISO 3166-1 alpha-2. Para Yaiwell en Fase 0/1
 *   queremos casi siempre `'es'` para no contaminar con resultados
 *   internacionales (hay 700+ "Plaça Catalunya" en el mundo).
 * - `limit`: 1-10. Default 5.
 * - `proximity`: punto de referencia para ordenar candidatos por
 *   cercanía. Sin esto, Mapbox prioriza por relevancia textual y
 *   "Calle Mayor" sale ambigua entre 200 candidatas.
 * - `types`: filtra a tipos concretos (e.g., solo `address` + `place`).
 */
export interface ForwardGeocodingOptions {
  language?: string;
  country?: string;
  limit?: number;
  proximity?: { lat: number; lng: number };
  types?: ReadonlyArray<GeocodingFeatureKind>;
}

/**
 * Opciones para `reverseGeocode` (coordenadas → dirección).
 *
 * Mismas que forward pero sin `country`/`proximity` (no aplican).
 */
export interface ReverseGeocodingOptions {
  language?: string;
  limit?: number;
  types?: ReadonlyArray<GeocodingFeatureKind>;
}
