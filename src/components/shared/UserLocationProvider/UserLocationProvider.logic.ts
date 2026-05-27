'use client';

import { createContext, useCallback, useContext, useMemo, useState } from 'react';

import {
  BARCELONA_CENTER,
  GEOLOCATION_MAX_AGE_MS,
  GEOLOCATION_TIMEOUT_MS,
  readLocationCookie,
  writeLocationCookie,
  clearLocationCookie,
  type LocationErrorCode,
  type LocationStatus,
  type UserLocation,
} from '@/lib/services/location';

import type { UserLocationContextValue } from './UserLocationProvider.types';

/**
 * Contexto que comparte la ubicación del usuario en toda la app cliente.
 *
 * Mantenerlo en un único contexto evita que distintos componentes
 * (banner, pill, mapa, ordenación) pidan la ubicación por separado y
 * acaben con varios prompts nativos consecutivos.
 */
const UserLocationContext = createContext<UserLocationContextValue | null>(null);

/**
 * Construye la `UserLocation` de fallback (centro de Barcelona).
 * Encapsulamos la creación porque siempre lleva el mismo `source` y un
 * `capturedAt` fresco para que los consumidores puedan ordenar por edad.
 */
function buildFallbackLocation(): UserLocation {
  return {
    lat: BARCELONA_CENTER.lat,
    lng: BARCELONA_CENTER.lng,
    capturedAt: Date.now(),
    source: 'fallback',
  };
}

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
    case 2:
      return 'POSITION_UNAVAILABLE';
    case 3:
      return 'TIMEOUT';
    default:
      return 'POSITION_UNAVAILABLE';
  }
}

/**
 * Hook de consumo del contexto.
 *
 * Si el componente vive fuera del provider devolvemos un fallback inerte
 * (centro Barcelona, `unavailable`) para no romper renders aislados en
 * tests o storybooks.
 */
export function useUserLocation(): UserLocationContextValue {
  const ctx = useContext(UserLocationContext);
  if (ctx) return ctx;

  return {
    status: 'unavailable',
    location: buildFallbackLocation(),
    hasRealLocation: false,
    error: 'NOT_SUPPORTED',
    request: async () => undefined,
    clear: () => undefined,
  };
}

interface UseUserLocationStateOptions {
  initialLocation?: UserLocation | null;
}

/**
 * Hook interno que mantiene el estado del provider.
 *
 * Lo extraemos del componente de UI para poder testearlo aisladamente
 * y para que `UserLocationProvider.tsx` solo se ocupe de pintar el
 * `Context.Provider`.
 */
export function useUserLocationState({
  initialLocation,
}: UseUserLocationStateOptions): UserLocationContextValue {
  // El primer render usa la ubicación inicial (preferentemente del SSR);
  // si no, intentamos leer la cookie en cliente; si tampoco, fallback.
  // Hacerlo en el initializer evita un render extra con el fallback.
  const [location, setLocation] = useState<UserLocation>(() => {
    if (initialLocation) return initialLocation;
    const fromCookie = readLocationCookie();
    if (fromCookie) return fromCookie;
    return buildFallbackLocation();
  });

  const [status, setStatus] = useState<LocationStatus>(() => {
    if (initialLocation && initialLocation.source !== 'fallback') return 'granted';
    const fromCookie = readLocationCookie();
    if (fromCookie && fromCookie.source !== 'fallback') return 'granted';
    return 'idle';
  });

  const [error, setError] = useState<LocationErrorCode | null>(null);

  // Nota: la hidratación desde cookie se hace en los `useState` inicializadores
  // de arriba. Evitamos un `useEffect` posterior porque dispararía un render
  // adicional y porque React Compiler lo señala como cascading render.

  const request = useCallback(async (): Promise<void> => {
    // Branch defensivo: en entornos sin navigator (SSR, tests sin polyfill)
    // marcamos NOT_SUPPORTED sin lanzar excepción.
    if (typeof navigator === 'undefined' || !('geolocation' in navigator)) {
      setError('NOT_SUPPORTED');
      setStatus('unavailable');
      return;
    }

    setStatus('requesting');
    setError(null);

    // Envolvemos la API basada en callbacks en una promesa para poder
    // usar async/await y unificar la gestión de éxito/error.
    await new Promise<void>((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const next: UserLocation = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracyMeters: Number.isFinite(position.coords.accuracy)
              ? position.coords.accuracy
              : undefined,
            capturedAt: Date.now(),
            source: 'gps',
          };
          // Persistimos primero la cookie para que cualquier SSR posterior
          // (navegación con `router.push`) ya la encuentre.
          writeLocationCookie(next);
          setLocation(next);
          setStatus('granted');
          setError(null);
          resolve();
        },
        (err) => {
          const code = mapGeolocationError(err);
          setError(code);
          setStatus(code === 'PERMISSION_DENIED' ? 'denied' : 'unavailable');
          // Mantenemos la `location` actual (fallback o última conocida)
          // para que la UI pueda seguir mostrando algo útil.
          resolve();
        },
        {
          // `enableHighAccuracy: false` evita activar el GPS del móvil
          // (más rápido, ahorra batería). Para el caso de uso "ver qué
          // tengo cerca a 1-3 km" la precisión Wi-Fi/IP es suficiente.
          enableHighAccuracy: false,
          timeout: GEOLOCATION_TIMEOUT_MS,
          maximumAge: GEOLOCATION_MAX_AGE_MS,
        },
      );
    });
  }, []);

  const clear = useCallback(() => {
    clearLocationCookie();
    setLocation(buildFallbackLocation());
    setStatus('idle');
    setError(null);
  }, []);

  const hasRealLocation = location.source === 'gps' || location.source === 'manual';

  return useMemo(
    () => ({ status, location, hasRealLocation, error, request, clear }),
    [status, location, hasRealLocation, error, request, clear],
  );
}

export { UserLocationContext };
