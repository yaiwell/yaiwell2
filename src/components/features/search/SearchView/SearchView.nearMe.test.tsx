import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ProviderWithAvailability } from '@/types/domain';

import { NEAR_ME_RADIUS_METERS, useNearMe } from './SearchView.nearMe';

/**
 * Tests del hook `useNearMe`.
 *
 * El hook depende de `useUserLocation` del provider compartido, así
 * que lo mockeamos por completo para poder controlar la posición y la
 * bandera `hasRealLocation` desde cada caso.
 */

const mockUseUserLocation = vi.fn();

vi.mock('@/components/shared/UserLocationProvider', () => ({
  useUserLocation: () => mockUseUserLocation(),
}));

/** Factory minimalista de proveedor para no acoplarnos al fixture real. */
function makeProvider(
  id: string,
  lat: number,
  lng: number,
): ProviderWithAvailability {
  return {
    id,
    slug: `slug-${id}`,
    name: `Proveedor ${id}`,
    type: 'centro',
    description: { es: '', ca: '' },
    address: '',
    location: { lat, lng },
    photos: [],
    rating: 4,
    reviewsCount: 0,
    priceRange: '€',
    categoryIds: [],
    availability: { status: 'available_now', nextSlot: null },
    distanceKm: null,
  };
}

// Plaça de Catalunya (BCN centro) como anchor del usuario.
const BCN_CENTER = { lat: 41.3874, lng: 2.1686 };

beforeEach(() => {
  mockUseUserLocation.mockReset();
});

describe('useNearMe', () => {
  it('ordena los proveedores por proximidad ascendente al usuario', () => {
    mockUseUserLocation.mockReturnValue({
      location: { ...BCN_CENTER, source: 'gps', capturedAt: Date.now() },
      hasRealLocation: true,
    });

    // Far ≈ 9 km (Castelldefels area), near ≈ 0.5 km (Eixample), mid ≈ 3 km (Gràcia alta).
    const providers = [
      makeProvider('far', 41.46, 2.21),
      makeProvider('near', 41.39, 2.17),
      makeProvider('mid', 41.42, 2.15),
    ];

    const { result } = renderHook(() => useNearMe(providers));

    const ids = result.current.displayProviders.map((p) => p.id);
    expect(ids).toEqual(['near', 'mid', 'far']);
    // La distancia es coherente con el orden y monotónica creciente.
    const distances = result.current.displayProviders.map((p) => p.distanceMeters);
    expect(distances[0]).toBeLessThan(distances[1]);
    expect(distances[1]).toBeLessThan(distances[2]);
  });

  it('filtra a los proveedores dentro del radio cuando se activa "Cerca de ti"', () => {
    mockUseUserLocation.mockReturnValue({
      location: { ...BCN_CENTER, source: 'gps', capturedAt: Date.now() },
      hasRealLocation: true,
    });

    const providers = [
      makeProvider('inside', 41.39, 2.17), // ~ 500 m
      makeProvider('outside', 41.5, 2.3), // > 15 km
    ];

    const { result } = renderHook(() => useNearMe(providers));

    expect(result.current.displayProviders).toHaveLength(2);

    act(() => {
      result.current.handleToggleNearMe();
    });

    expect(result.current.nearMeOnly).toBe(true);
    expect(result.current.displayProviders.map((p) => p.id)).toEqual(['inside']);
  });

  it('marca nearMeYieldedEmpty cuando el filtro no deja ningún resultado', () => {
    mockUseUserLocation.mockReturnValue({
      location: { ...BCN_CENTER, source: 'fallback', capturedAt: Date.now() },
      hasRealLocation: false,
    });

    // Todos a > 10 km del usuario, fuera del radio de 5 km.
    const providers = [
      makeProvider('a', 41.5, 2.3),
      makeProvider('b', 41.55, 2.35),
    ];

    const { result } = renderHook(() => useNearMe(providers));

    act(() => {
      result.current.handleToggleNearMe();
    });

    expect(result.current.nearMeYieldedEmpty).toBe(true);

    act(() => {
      result.current.handleDisableNearMe();
    });

    expect(result.current.nearMeOnly).toBe(false);
    expect(result.current.nearMeYieldedEmpty).toBe(false);
  });

  it('propaga hasRealLocation desde el provider', () => {
    mockUseUserLocation.mockReturnValue({
      location: { ...BCN_CENTER, source: 'fallback', capturedAt: Date.now() },
      hasRealLocation: false,
    });

    const { result } = renderHook(() => useNearMe([]));

    expect(result.current.hasRealLocation).toBe(false);
  });

  it('expone la constante NEAR_ME_RADIUS_METERS y la usa en el filtro', () => {
    expect(NEAR_ME_RADIUS_METERS).toBeGreaterThan(0);

    mockUseUserLocation.mockReturnValue({
      location: { ...BCN_CENTER, source: 'gps', capturedAt: Date.now() },
      hasRealLocation: true,
    });

    // Un punto exactamente al borde del radio (~4.5 km al sur).
    const providers = [makeProvider('edge', 41.347, 2.1686)];
    const { result } = renderHook(() => useNearMe(providers));

    act(() => {
      result.current.handleToggleNearMe();
    });

    // El punto está dentro del radio; debe permanecer.
    expect(result.current.displayProviders).toHaveLength(1);
  });
});
