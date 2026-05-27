'use client';

import { UserLocationContext, useUserLocationState } from './UserLocationProvider.logic';
import type { UserLocationProviderProps } from './UserLocationProvider.types';

/**
 * Provider de ubicación del usuario.
 *
 * Responsabilidades:
 *  - Hidratar el estado inicial desde la cookie (si la hay) para que el
 *    primer render coincida con SSR y no haya parpadeo.
 *  - Exponer un único hook (`useUserLocation`) a toda la app cliente para
 *    leer la ubicación, pedirla o limpiarla.
 *
 * Se monta una sola vez en el layout raíz; los consumidores (banner, pill,
 * búsqueda, mapa) viven dentro y comparten el mismo estado.
 */
export function UserLocationProvider({ initialLocation, children }: UserLocationProviderProps) {
  const value = useUserLocationState({ initialLocation: initialLocation ?? null });

  return <UserLocationContext.Provider value={value}>{children}</UserLocationContext.Provider>;
}
