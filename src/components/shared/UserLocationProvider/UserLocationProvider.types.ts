/**
 * Tipos del componente `UserLocationProvider`.
 *
 * Vivimos en un archivo aparte porque tanto el provider como los
 * consumidores (futuro pill, banner, search) importan estos tipos sin
 * arrastrar el código del provider en sí.
 */

import type {
  LocationErrorCode,
  LocationStatus,
  UserLocation,
} from '@/lib/services/location';

export interface UserLocationContextValue {
  /** Estado actual del flujo de geolocalización. */
  status: LocationStatus;
  /**
   * Coordenadas que la UI debe usar.
   *
   * Siempre devuelve algo: en `granted` es la posición real; en cualquier
   * otro caso (`idle`, `denied`, `fallback`...) devuelve el centro de
   * Barcelona. De esta forma los consumidores nunca tienen que comprobar
   * `null` para pintar el mapa o calcular distancias.
   */
  location: UserLocation;
  /** True solo cuando la posición proviene de GPS real (no fallback). */
  hasRealLocation: boolean;
  /** Último código de error que se haya producido en una `request()`. */
  error: LocationErrorCode | null;
  /**
   * Pide la ubicación al navegador. Resuelve cuando termina (con éxito,
   * denegación, timeout o no soportado). Nunca lanza: los errores se
   * exponen vía `error` y `status`.
   */
  request: () => Promise<void>;
  /** Limpia la ubicación guardada y vuelve al estado fallback. */
  clear: () => void;
}

export interface UserLocationProviderProps {
  /**
   * Ubicación inicial cuando el layout ya ha podido leer la cookie en
   * servidor. Permite que el primer render del cliente coincida con el
   * SSR sin parpadeo.
   */
  initialLocation?: UserLocation | null;
  children: React.ReactNode;
}
