/**
 * Tests del `LocationPill`.
 *
 * Verificamos que:
 *  - El trigger siempre se renderiza con su aria-label.
 *  - El popover abre/cierra al hacer click sobre el trigger.
 *  - El CTA expuesto en el popover depende del estado del provider.
 */
import { render, screen, fireEvent } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it, vi } from 'vitest';

import esMessages from '@/messages/es.json';

import { LocationPill } from './LocationPill';

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
  clear: vi.fn(),
}));

vi.mock('@/components/shared/UserLocationProvider', () => ({
  useUserLocation: () => ({
    status: mocks.status,
    request: mocks.request,
    clear: mocks.clear,
    location: { lat: 0, lng: 0, capturedAt: 0, source: 'fallback' as const },
    hasRealLocation: false,
    error: null,
  }),
}));

function renderPill() {
  return render(
    <NextIntlClientProvider locale="es" messages={esMessages}>
      <LocationPill />
    </NextIntlClientProvider>,
  );
}

afterEach(() => {
  mocks.status = 'idle';
  mocks.request.mockReset();
  mocks.clear.mockReset();
});

describe('LocationPill', () => {
  it('renderiza el trigger con aria-label accesible', () => {
    renderPill();
    expect(
      screen.getByRole('button', { name: esMessages.location.pill.openAria }),
    ).toBeInTheDocument();
  });

  it('abre el popover al hacer click sobre el trigger', () => {
    renderPill();
    const trigger = screen.getByRole('button', { name: esMessages.location.pill.openAria });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    fireEvent.click(trigger);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText(esMessages.location.pill.fallbackTitle)).toBeInTheDocument();
  });

  it('en estado granted ofrece "Quitar ubicación" y dispara clear()', () => {
    mocks.status = 'granted';
    renderPill();
    fireEvent.click(screen.getByRole('button', { name: esMessages.location.pill.openAria }));
    const clearBtn = screen.getByRole('button', { name: esMessages.location.clear });
    fireEvent.click(clearBtn);
    expect(mocks.clear).toHaveBeenCalledTimes(1);
  });

  it('en estado denied muestra la ayuda explicativa', () => {
    mocks.status = 'denied';
    renderPill();
    fireEvent.click(screen.getByRole('button', { name: esMessages.location.pill.openAria }));
    expect(screen.getByText(esMessages.location.deniedHelp)).toBeInTheDocument();
  });
});
