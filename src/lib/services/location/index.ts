/**
 * API pública del módulo `location`.
 *
 * Cualquier consumidor (provider de React, server actions, route handlers,
 * componentes de búsqueda) debe importar desde aquí. Importar archivos
 * internos directamente está prohibido por convención del proyecto.
 */

export {
  BARCELONA_CENTER,
  COOKIE_MAX_AGE_SECONDS,
  COOKIE_NAME,
  GEOLOCATION_MAX_AGE_MS,
  GEOLOCATION_TIMEOUT_MS,
} from './location.constants';

export { formatDistance, haversineDistance } from './distance';

export {
  clearLocationCookie,
  readLocationCookie,
  readLocationFromHeaders,
  writeLocationCookie,
} from './location.cookie';

export {
  NotSupportedError,
  PermissionDeniedError,
  PositionUnavailableError,
  TimeoutError,
} from './location.errors';

export type { LocationErrorCode, LocationStatus, UserLocation } from './location.types';
