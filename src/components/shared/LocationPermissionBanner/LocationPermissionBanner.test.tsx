/**
 * Tests del `LocationPermissionBanner`.
 *
 * Cubrimos los tres comportamientos clave:
 *  1. Sólo se renderiza cuando el estado es `idle`.
 *  2. Al pulsar "Permitir" se invoca `request()` del provider.
 *  3. Al pulsar "Ahora no" se oculta y se persiste en sessionStorage.
 *
 * Mockeamos el hook `useUserLocation` para aislar el componente del
 * provider real (no nos interesa probar el provider aquí).
 */
import { render, screen, fireEvent } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it, vi } from 'vitest';

import esMessages from '@/messages/es.json';

import { LocationPermissionBanner } from './LocationPermissionBanner';

// Mock del hook compartido. `vi.hoisted` permite reescribir el valor
// retornado entre tests.
const mocks = vi.hoisted(() => ({
  status: 'idle' as
    | 'idle'
    | 'prompting'
    | 'requesting'
    | 'granted'
    | 'denied'
    | 'unavailable'
    | 'fallback',
  request: vi.fn(),
}));

vi.mock('@/components/shared/UserLocationProvider', () => ({
  useUserLocation: () => ({
    status: mocks.status,
    request: mocks.request,
    clear: vi.fn(),
    location: { lat: 0, lng: 0, capturedAt: 0, source: 'fallback' as const },
    hasRealLocation: false,
    error: null,
  }),
}));

function renderBanner() {
  return render(
    <NextIntlClientProvider locale="es" messages={esMessages}>
      <LocationPermissionBanner storageKey="test:dismiss" />
    </NextIntlClientProvider>,
  );
}

afterEach(() => {
  mocks.status = 'idle';
  mocks.request.mockReset();
  window.sessionStorage.clear();
});

describe('LocationPermissionBanner', () => {
  it('renderiza el banner cuando el estado es idle y no se ha descartado', () => {
    renderBanner();
    expect(screen.getByText(esMessages.location.permissionTitle)).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: esMessages.location.permissionEnable }),
    ).toBeInTheDocument();
  });

  it('no se renderiza si el estado es granted', () => {
    mocks.status = 'granted';
    const { container } = renderBanner();
    expect(container.firstChild).toBeNull();
  });

  it('no se renderiza si el estado es denied', () => {
    mocks.status = 'denied';
    const { container } = renderBanner();
    expect(container.firstChild).toBeNull();
  });

  it('invoca request() al pulsar el CTA principal', () => {
    renderBanner();
    fireEvent.click(
      screen.getByRole('button', { name: esMessages.location.permissionEnable }),
    );
    expect(mocks.request).toHaveBeenCalledTimes(1);
  });

  it('oculta el banner y persiste el dismiss al pulsar "Ahora no"', () => {
    const { container } = renderBanner();
    // Click sobre el botón inferior "Ahora no" (no el de la X).
    const dismissButtons = screen.getAllByRole('button', {
      name: esMessages.location.permissionDismiss,
    });
    fireEvent.click(dismissButtons[dismissButtons.length - 1]!);
    expect(container.firstChild).toBeNull();
    expect(window.sessionStorage.getItem('test:dismiss')).toBe('1');
  });
});
