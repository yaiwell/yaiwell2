/**
 * API pública de la integración Mapbox.
 *
 * Importa desde aquí, no desde archivos internos, para que podamos
 * refactorizar la organización del módulo sin romper consumidores.
 */

export { geocodeAddress, reverseGeocode } from './mapbox.service';
export { MapboxConfigError, MapboxRequestError } from './mapbox.errors';
export type {
  ForwardGeocodingOptions,
  GeocodingFeatureKind,
  GeocodingResult,
  ReverseGeocodingOptions,
} from './mapbox.types';
