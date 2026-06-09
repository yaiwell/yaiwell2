import { MapboxConfigError, MapboxRequestError } from './mapbox.errors';
import type {
  ForwardGeocodingOptions,
  GeocodingFeatureKind,
  GeocodingResult,
  ReverseGeocodingOptions,
} from './mapbox.types';

/**
 * Wrapper sobre la Geocoding API v6 de Mapbox.
 *
 * Decisiones de diseño:
 *  - Usamos `fetch` plano (no `@mapbox/mapbox-sdk`) para ahorrar
 *    ~80kB de bundle. La v6 es REST-puro y devuelve GeoJSON estable.
 *  - El token se lee en cada llamada, no a módulo-load, para que tests
 *    puedan cambiarlo con `delete process.env...` sin `vi.resetModules`.
 *  - Devolvemos shape propio (`GeocodingResult`) en lugar del Feature
 *    GeoJSON crudo, para que la UI no se acople a la forma de Mapbox.
 *  - Errores tipados (`MapboxConfigError` vs `MapboxRequestError`)
 *    para que el caller decida reintento/fallback sin parsear strings.
 *
 * Endpoint docs: https://docs.mapbox.com/api/search/geocoding/
 */

const FORWARD_URL = 'https://api.mapbox.com/search/geocode/v6/forward';
const REVERSE_URL = 'https://api.mapbox.com/search/geocode/v6/reverse';

// Tipo mínimo del Feature v6 que parseamos. Mapbox documenta más campos
// (context, match_code, accuracy) pero no los necesitamos hoy.
interface MapboxFeatureV6 {
  id?: string;
  geometry?: { coordinates?: [number, number] };
  properties?: {
    mapbox_id?: string;
    name?: string;
    full_address?: string;
    place_formatted?: string;
    feature_type?: string;
    coordinates?: { longitude: number; latitude: number };
  };
}

interface MapboxFeatureCollectionV6 {
  type?: string;
  features?: MapboxFeatureV6[];
}

/**
 * Geocoding forward: convierte texto en candidatos de ubicación.
 *
 * @param query texto libre (e.g., "Carrer d'Aragó 256 Barcelona").
 * @param options ver `ForwardGeocodingOptions`.
 * @returns lista de candidatos ordenados por relevancia (vacío si
 *   `query` está vacío tras `trim`).
 * @throws MapboxConfigError si falta `NEXT_PUBLIC_MAPBOX_TOKEN`.
 * @throws MapboxRequestError si la API responde con status no-OK.
 */
export async function geocodeAddress(
  query: string,
  options: ForwardGeocodingOptions = {},
): Promise<GeocodingResult[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const url = new URL(FORWARD_URL);
  url.searchParams.set('q', trimmed);
  url.searchParams.set('access_token', readToken());
  applyLanguageLimitTypes(url, options);
  if (options.country) url.searchParams.set('country', options.country);
  if (options.proximity) {
    // Mapbox quiere "lng,lat" — invertimos para que el caller pueda
    // pasar `{lat, lng}` consistente con el resto del proyecto.
    url.searchParams.set('proximity', `${options.proximity.lng},${options.proximity.lat}`);
  }

  return fetchAndParse(url, 'forward');
}

/**
 * Reverse geocoding: convierte coordenadas en una dirección legible.
 *
 * @param point coordenadas WGS84.
 * @param options ver `ReverseGeocodingOptions`.
 * @returns lista de candidatos (típicamente 1 — el más cercano).
 * @throws MapboxConfigError si falta `NEXT_PUBLIC_MAPBOX_TOKEN`.
 * @throws MapboxRequestError si la API responde con status no-OK.
 */
export async function reverseGeocode(
  point: { lat: number; lng: number },
  options: ReverseGeocodingOptions = {},
): Promise<GeocodingResult[]> {
  const url = new URL(REVERSE_URL);
  url.searchParams.set('longitude', String(point.lng));
  url.searchParams.set('latitude', String(point.lat));
  url.searchParams.set('access_token', readToken());
  applyLanguageLimitTypes(url, options);

  return fetchAndParse(url, 'reverse');
}

function readToken(): string {
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  if (!token) throw new MapboxConfigError();
  return token;
}

function applyLanguageLimitTypes(
  url: URL,
  options: ForwardGeocodingOptions | ReverseGeocodingOptions,
) {
  if (options.language) url.searchParams.set('language', options.language);
  if (typeof options.limit === 'number') {
    url.searchParams.set('limit', String(options.limit));
  }
  if (options.types && options.types.length > 0) {
    url.searchParams.set('types', options.types.join(','));
  }
}

async function fetchAndParse(url: URL, mode: 'forward' | 'reverse'): Promise<GeocodingResult[]> {
  const response = await fetch(url.toString(), {
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) {
    throw new MapboxRequestError(
      response.status,
      `Mapbox ${mode} geocoding fallo (HTTP ${response.status}).`,
    );
  }
  const data = (await response.json()) as MapboxFeatureCollectionV6;
  return parseFeatures(data);
}

function parseFeatures(data: MapboxFeatureCollectionV6): GeocodingResult[] {
  const features = Array.isArray(data.features) ? data.features : [];
  const results: GeocodingResult[] = [];
  for (const feature of features) {
    const result = parseFeature(feature);
    if (result) results.push(result);
  }
  return results;
}

function parseFeature(feature: MapboxFeatureV6): GeocodingResult | null {
  const props = feature.properties;
  if (!props) return null;

  // v6 expone coords tanto en `properties.coordinates` (objeto) como
  // en `geometry.coordinates` (array). Preferimos el objeto porque es
  // explícito; caemos al geometry si no está.
  const coords = props.coordinates ?? geometryToCoords(feature.geometry);
  if (!coords) return null;

  const id = feature.id ?? props.mapbox_id;
  const name = props.name?.trim();
  if (!id || !name) return null;

  return {
    id,
    name,
    fullAddress: props.full_address ?? props.place_formatted ?? name,
    lat: coords.latitude,
    lng: coords.longitude,
    kind: normalizeKind(props.feature_type),
  };
}

function geometryToCoords(geometry?: {
  coordinates?: [number, number];
}): { longitude: number; latitude: number } | null {
  if (!geometry?.coordinates) return null;
  const [longitude, latitude] = geometry.coordinates;
  if (typeof longitude !== 'number' || typeof latitude !== 'number') return null;
  return { longitude, latitude };
}

const FEATURE_KINDS: ReadonlyArray<GeocodingFeatureKind> = [
  'country',
  'region',
  'postcode',
  'district',
  'place',
  'locality',
  'neighborhood',
  'street',
  'address',
];

function normalizeKind(raw?: string): GeocodingFeatureKind {
  if (raw && (FEATURE_KINDS as ReadonlyArray<string>).includes(raw)) {
    return raw as GeocodingFeatureKind;
  }
  // Si Mapbox introduce un tipo nuevo (o devuelve undefined), caemos a
  // `address` que es el caso más restrictivo — la UI puede filtrar más
  // fino con `types: [...]` si necesita garantías estrictas.
  return 'address';
}
