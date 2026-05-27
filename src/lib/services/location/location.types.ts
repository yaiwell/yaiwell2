/**
 * Tipos del dominio "location".
 *
 * Centralizamos aquí los tipos que la infraestructura de geolocalización
 * comparte: la ubicación normalizada del usuario, los estados de UX
 * posibles y los códigos de error tipados.
 *
 * El motivo de tener `source` es poder distinguir en UI (chip, filtros,
 * ordenación) si los resultados se basan en la posición real del usuario
 * o en el centro de Barcelona como fallback.
 */

export interface UserLocation {
  /** Latitud en grados decimales (WGS84). */
  lat: number;
  /** Longitud en grados decimales (WGS84). */
  lng: number;
  /** Precisión reportada por la API en metros. Opcional. */
  accuracyMeters?: number;
  /** Timestamp (ms epoch) cuando se obtuvo la posición. */
  capturedAt: number;
  /**
   * Origen de la coordenada:
   *  - `gps`: obtenida vía `navigator.geolocation`.
   *  - `fallback`: usamos el centro de Barcelona porque no hay GPS.
   *  - `manual`: introducida manualmente por el usuario (fase 1).
   */
  source: 'gps' | 'fallback' | 'manual';
}

/**
 * Estados de UX del flujo de geolocalización.
 *
 * Mantener un único enum simplifica los renderizados condicionales en C2
 * (banner, pill, modal) y evita combinaciones booleanas inconsistentes.
 */
export type LocationStatus =
  /** No se ha pedido aún la ubicación en esta sesión. */
  | 'idle'
  /** Se está mostrando UI custom previa al prompt nativo del navegador. */
  | 'prompting'
  /** Petición a `navigator.geolocation` en curso. */
  | 'requesting'
  /** Tenemos una ubicación real válida. */
  | 'granted'
  /** El usuario ha denegado el permiso (en navegador o en nuestro modal). */
  | 'denied'
  /** El navegador no soporta geolocation o ha fallado técnicamente. */
  | 'unavailable'
  /** Usamos el centro de Barcelona porque no hay ubicación real. */
  | 'fallback';

/**
 * Códigos de error públicos para que el caller decida qué UI mostrar
 * sin acoplarse a strings ad-hoc.
 */
export type LocationErrorCode =
  | 'PERMISSION_DENIED'
  | 'POSITION_UNAVAILABLE'
  | 'TIMEOUT'
  | 'NOT_SUPPORTED';
