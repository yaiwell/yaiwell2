'use client';

import {
  GEOLOCATION_HIGH_ACCURACY_TIMEOUT_MS,
  GEOLOCATION_MAX_AGE_MS,
  GEOLOCATION_TIMEOUT_MS,
  type LocationErrorCode,
  type UserLocation,
} from '@/lib/services/location';

/** Resultado de una lectura: la posición o el motivo del fallo. */
export type PositionResult =
  | { ok: true; location: UserLocation }
  | { ok: false; code: LocationErrorCode };

/**
 * Mapea el código nativo de `GeolocationPositionError` a nuestro
 * `LocationErrorCode` tipado.
 *
 * Las constantes (1, 2, 3) están fijadas por la especificación W3C; las
 * usamos numéricas porque algunos navegadores no exponen las propiedades
 * `PERMISSION_DENIED` / `POSITION_UNAVAILABLE` / `TIMEOUT` como
 * enumerables en el prototipo.
 */
function mapGeolocationError(err: GeolocationPositionError): LocationErrorCode {
  switch (err.code) {
    case 1:
      return 'PERMISSION_DENIED';
    case 3:
      return 'TIMEOUT';
    default:
      return 'POSITION_UNAVAILABLE';
  }
}

/** Envuelve `getCurrentPosition` en una promesa que nunca rechaza. */
function readOnce(options: PositionOptions): Promise<PositionResult> {
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (position) =>
        resolve({
          ok: true,
          location: {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracyMeters: Number.isFinite(position.coords.accuracy)
              ? position.coords.accuracy
              : undefined,
            capturedAt: Date.now(),
            source: 'gps',
          },
        }),
      (err) => resolve({ ok: false, code: mapGeolocationError(err) }),
      options,
    );
  });
}

/**
 * Lee la posición del dispositivo en dos intentos.
 *
 * Primero sin GPS (Wi-Fi/red): es rápido y basta para «qué tengo cerca».
 * Si falla por tiempo o por no poder situarse —típico en Android con la
 * precisión de Google desactivada o en interiores—, repetimos con GPS y
 * más margen. Antes ese primer fallo dejaba al usuario sin ubicación
 * aunque hubiera dado permiso. Un permiso denegado no se reintenta: el
 * navegador volvería a contestar lo mismo.
 */
export async function readCurrentPosition(): Promise<PositionResult> {
  const fast = await readOnce({
    enableHighAccuracy: false,
    timeout: GEOLOCATION_TIMEOUT_MS,
    maximumAge: GEOLOCATION_MAX_AGE_MS,
  });
  if (fast.ok || fast.code === 'PERMISSION_DENIED') return fast;

  return readOnce({
    enableHighAccuracy: true,
    timeout: GEOLOCATION_HIGH_ACCURACY_TIMEOUT_MS,
    maximumAge: GEOLOCATION_MAX_AGE_MS,
  });
}

/**
 * Estado del permiso de ubicación según el navegador, sin mostrar ningún
 * aviso. Devuelve `null` si la Permissions API no existe (Safari antiguo)
 * o falla: en ese caso no sabemos nada y no hay que asumir.
 */
export async function queryGeolocationPermission(): Promise<PermissionStatus | null> {
  if (typeof navigator === 'undefined' || !navigator.permissions?.query) return null;
  try {
    return await navigator.permissions.query({ name: 'geolocation' });
  } catch {
    return null;
  }
}
