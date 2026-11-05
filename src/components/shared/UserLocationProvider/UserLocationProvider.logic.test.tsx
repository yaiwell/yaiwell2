/**
 * Tests de la actualización de la ubicación guardada.
 *
 * Lo crítico: quien ya dio permiso y cambia de sitio debe ver su posición
 * nueva sin pulsar nada, aunque la cookie siga vigente, y un fallo al
 * refrescar no debe borrar la última posición conocida.
 */

import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { UserLocation } from '@/lib/services/location';

const geo = vi.hoisted(() => ({
  queryGeolocationPermission: vi.fn(),
  readCurrentPosition: vi.fn(),
}));

vi.mock('./UserLocationProvider.geolocation', () => geo);

import { useUserLocationState } from './UserLocationProvider.logic';

const CASTELLAR: UserLocation = {
  lat: 41.61,
  lng: 2.08,
  capturedAt: Date.now() - 3 * 24 * 60 * 60 * 1000,
  source: 'gps',
};
const PALMA: UserLocation = { lat: 39.57, lng: 2.65, capturedAt: Date.now(), source: 'gps' };

function permission(state: PermissionState) {
  return { state, addEventListener: vi.fn(), removeEventListener: vi.fn() };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal('navigator', { ...navigator, geolocation: {} });
});

describe('useUserLocationState', () => {
  it('con permiso concedido cambia una ubicación guardada por la actual', async () => {
    geo.queryGeolocationPermission.mockResolvedValue(permission('granted'));
    geo.readCurrentPosition.mockResolvedValue({ ok: true, location: PALMA });

    const { result } = renderHook(() => useUserLocationState({ initialLocation: CASTELLAR }));

    expect(result.current.location.lat).toBe(CASTELLAR.lat);
    await waitFor(() => expect(result.current.location.lat).toBe(PALMA.lat));
    expect(result.current.status).toBe('granted');
  });

  it('el refresco en segundo plano no pone la pantalla en «localizando»', async () => {
    geo.queryGeolocationPermission.mockResolvedValue(permission('granted'));
    let finish: (value: unknown) => void = () => undefined;
    geo.readCurrentPosition.mockReturnValue(new Promise((resolve) => (finish = resolve)));

    const { result } = renderHook(() => useUserLocationState({ initialLocation: CASTELLAR }));

    await waitFor(() => expect(geo.readCurrentPosition).toHaveBeenCalled());
    expect(result.current.status).toBe('granted');

    finish({ ok: true, location: PALMA });
    await waitFor(() => expect(result.current.location.lat).toBe(PALMA.lat));
  });

  it('si el refresco falla conserva la última posición y el estado', async () => {
    geo.queryGeolocationPermission.mockResolvedValue(permission('granted'));
    geo.readCurrentPosition.mockResolvedValue({ ok: false, code: 'TIMEOUT' });

    const { result } = renderHook(() => useUserLocationState({ initialLocation: CASTELLAR }));

    await waitFor(() => expect(geo.readCurrentPosition).toHaveBeenCalled());
    await waitFor(() => expect(result.current.status).toBe('granted'));
    expect(result.current.location.lat).toBe(CASTELLAR.lat);
    expect(result.current.error).toBeNull();
  });

  it('sin permiso concedido no lee la posición, para no mostrar el aviso', async () => {
    geo.queryGeolocationPermission.mockResolvedValue(permission('prompt'));

    renderHook(() => useUserLocationState({ initialLocation: CASTELLAR }));

    await waitFor(() => expect(geo.queryGeolocationPermission).toHaveBeenCalled());
    await Promise.resolve();
    expect(geo.readCurrentPosition).not.toHaveBeenCalled();
  });
});
