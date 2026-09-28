'use client';

import { useCallback, useMemo, useState } from 'react';

import { useUserLocation } from '@/components/shared/UserLocationProvider';
import { haversineDistance } from '@/lib/services/location';
import type { ProviderWithAvailability } from '@/types/domain';

import type { ProviderWithDistance } from './SearchView.types';

/**
 * Radio (en metros) aplicado por el chip "Cerca de ti".
 *
 * 5 km cubren cómodamente cualquier desplazamiento urbano corto en
 * Barcelona (peatonal, bici, transporte público) sin dejar al usuario
 * con cero resultados a no ser que esté en una zona muy aislada. En
 * Fase 1 será configurable por la UI o por el plan del proveedor.
 */
export const NEAR_ME_RADIUS_METERS = 5_000;

/**
 * Hook que integra la ubicación del usuario en el listado de
 * proveedores: añade la distancia, ordena por proximidad y gestiona el
 * toggle "Cerca de ti" (filtro por radio).
 *
 * Vive aparte del orquestador principal porque concentra una pieza de
 * lógica acotada y reutilizable, y para mantener el archivo principal
 * de `useSearchView` por debajo del límite de 250 líneas marcado por
 * las reglas de proyecto (§6.bis).
 */
export function useNearMe(
  providers: ProviderWithAvailability[],
  options: {
    initialNearMeOnly?: boolean;
    /**
     * Se invoca con el nuevo valor cada vez que el usuario cambia el
     * toggle. El orquestador lo usa para reflejar `?near=me` en la URL;
     * el hook no conoce el router para seguir siendo testeable aislado.
     */
    onNearMeChange?: (next: boolean) => void;
  } = {},
) {
  const { initialNearMeOnly = false, onNearMeChange } = options;

  // Ubicación del usuario (real o fallback BCN). El provider siempre
  // devuelve algo, así que nunca tenemos que comprobar `null` aquí.
  const { location: userLocation, hasRealLocation } = useUserLocation();

  // El filtro se aplica en cliente sobre la lista ya ordenada por
  // proximidad, pero su valor viaja en la URL (`?near=me`). Guardamos
  // copia local para que el chip responda al instante, sin esperar a
  // que termine la navegación.
  const [nearMeOnly, setNearMeOnly] = useState(initialNearMeOnly);

  // Si la URL cambia por fuera (atrás/adelante del navegador), el valor
  // inicial que llega del server cambia y hay que re-sincronizar. Se
  // ajusta durante el render —patrón recomendado por React— en lugar de
  // con un efecto, para no pintar un frame con el chip desfasado.
  const [syncedInitial, setSyncedInitial] = useState(initialNearMeOnly);
  if (syncedInitial !== initialNearMeOnly) {
    setSyncedInitial(initialNearMeOnly);
    setNearMeOnly(initialNearMeOnly);
  }

  /**
   * Lista enriquecida con la distancia real y ordenada de cerca a lejos.
   *
   * Usamos `haversineDistance` del módulo `location` (la misma fuente
   * que el badge de la card) para que el orden y la etiqueta visible
   * sean siempre coherentes — sin diferencias por redondeos.
   */
  const providersWithDistance = useMemo<ProviderWithDistance[]>(() => {
    const enriched = providers.map((p) => ({
      ...p,
      distanceMeters: haversineDistance(userLocation, p.location),
    }));

    enriched.sort((a, b) => {
      // Empujamos al final cualquier registro con distancia desconocida
      // (NaN) para no contaminar el orden por proximidad.
      const aValid = Number.isFinite(a.distanceMeters);
      const bValid = Number.isFinite(b.distanceMeters);
      if (aValid && !bValid) return -1;
      if (!aValid && bValid) return 1;
      if (!aValid && !bValid) return 0;
      return a.distanceMeters - b.distanceMeters;
    });

    return enriched;
  }, [providers, userLocation]);

  /**
   * Lista visible tras aplicar el filtro por radio.
   * Si el toggle está apagado, devolvemos la lista completa ordenada.
   */
  const displayProviders = useMemo<ProviderWithDistance[]>(() => {
    if (!nearMeOnly) return providersWithDistance;
    return providersWithDistance.filter(
      (p) => Number.isFinite(p.distanceMeters) && p.distanceMeters <= NEAR_ME_RADIUS_METERS,
    );
  }, [providersWithDistance, nearMeOnly]);

  /**
   * `true` cuando el filtro está activo y ha vaciado la lista. Lo
   * usamos para mostrar un empty state con CTA de desactivación, en
   * lugar del genérico "sin resultados".
   */
  const nearMeYieldedEmpty = nearMeOnly && displayProviders.length === 0;

  // Calculamos el siguiente valor fuera del updater de `setState`: el
  // callback de URL es un efecto secundario y React puede invocar los
  // updaters dos veces en StrictMode.
  const handleToggleNearMe = useCallback(() => {
    const next = !nearMeOnly;
    setNearMeOnly(next);
    onNearMeChange?.(next);
  }, [nearMeOnly, onNearMeChange]);

  const handleDisableNearMe = useCallback(() => {
    setNearMeOnly(false);
    onNearMeChange?.(false);
  }, [onNearMeChange]);

  return {
    userLocation,
    hasRealLocation,
    nearMeOnly,
    displayProviders,
    nearMeYieldedEmpty,
    handleToggleNearMe,
    handleDisableNearMe,
  };
}
