'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  BARCELONA_CENTER,
  readLocationCookie,
  writeLocationCookie,
  clearLocationCookie,
  type LocationErrorCode,
  type LocationStatus,
  type UserLocation,
} from '@/lib/services/location';

import {
  queryGeolocationPermission,
  readCurrentPosition,
} from './UserLocationProvider.geolocation';
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
    request: async () => false,
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

  // Petición en curso compartida: el banner, la pill y el buscador pueden
  // pedir la ubicación casi a la vez y no queremos dos lecturas ni dos
  // avisos del navegador seguidos.
  const inflight = useRef<Promise<boolean> | null>(null);

  const request = useCallback((): Promise<boolean> => {
    if (inflight.current) return inflight.current;

    // Branch defensivo: en entornos sin navigator (SSR, tests sin polyfill)
    // marcamos NOT_SUPPORTED sin lanzar excepción.
    if (typeof navigator === 'undefined' || !('geolocation' in navigator)) {
      setError('NOT_SUPPORTED');
      setStatus('unavailable');
      return Promise.resolve(false);
    }

    setStatus('requesting');
    setError(null);

    const run = readCurrentPosition().then((result) => {
      inflight.current = null;
      if (result.ok) {
        // Persistimos primero la cookie para que cualquier SSR posterior
        // (navegación con `router.push`) ya la encuentre.
        writeLocationCookie(result.location);
        setLocation(result.location);
        setStatus('granted');
        setError(null);
        return true;
      }
      // Mantenemos la `location` actual (fallback o última conocida)
      // para que la UI pueda seguir mostrando algo útil.
      setError(result.code);
      setStatus(result.code === 'PERMISSION_DENIED' ? 'denied' : 'unavailable');
      return false;
    });
    inflight.current = run;
    return run;
  }, []);

  const clear = useCallback(() => {
    clearLocationCookie();
    setLocation(buildFallbackLocation());
    setStatus('idle');
    setError(null);
  }, []);

  // Estado de partida (cookie con GPS o no). Se fija una vez para que el
  // efecto de abajo no se repita en cada cambio de estado.
  const [startedWithRealLocation] = useState(status === 'granted');

  // Sincronización con el permiso real del navegador, sin mostrar avisos:
  //  - Si ya lo concedió pero no tenemos su posición (cookie caducada o
  //    borrada), la leemos en silencio. Antes le volvíamos a pedir
  //    permiso aunque ya lo hubiera dado.
  //  - Si lo tiene bloqueado, lo decimos desde el principio en lugar de
  //    ofrecer un «Activar» que no puede funcionar.
  //  - Si lo cambia en los ajustes con la web abierta, reaccionamos.
  useEffect(() => {
    let permission: PermissionStatus | null = null;
    let cancelled = false;

    const apply = (state: PermissionState, isChange: boolean) => {
      if (state === 'granted' && (isChange || !startedWithRealLocation)) {
        void request();
      } else if (state === 'denied') {
        if (isChange) {
          // Revocado en los ajustes: dejamos de usar la posición guardada.
          clearLocationCookie();
          setLocation(buildFallbackLocation());
        }
        setError('PERMISSION_DENIED');
        setStatus('denied');
      }
    };
    const onChange = () => {
      if (permission) apply(permission.state, true);
    };

    void queryGeolocationPermission().then((result) => {
      if (cancelled || !result) return;
      permission = result;
      apply(result.state, false);
      result.addEventListener('change', onChange);
    });

    return () => {
      cancelled = true;
      permission?.removeEventListener('change', onChange);
    };
  }, [request, startedWithRealLocation]);

  const hasRealLocation = location.source === 'gps' || location.source === 'manual';

  return useMemo(
    () => ({ status, location, hasRealLocation, error, request, clear }),
    [status, location, hasRealLocation, error, request, clear],
  );
}

export { UserLocationContext };
