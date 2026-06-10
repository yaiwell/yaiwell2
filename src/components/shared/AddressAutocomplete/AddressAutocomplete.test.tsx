import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NextIntlClientProvider } from 'next-intl';
import { useState } from 'react';
import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';

import type { GeocodingResult } from '@/lib/integrations/mapbox';

import { AddressAutocomplete } from './AddressAutocomplete';
import type { AddressSelection } from './AddressAutocomplete.types';

/**
 * Tests del componente AddressAutocomplete.
 *
 * Mockeamos `fetch` global porque el componente llama directamente al
 * endpoint `/api/geocoding/forward`. Cada test envuelve el render en un
 * `QueryClientProvider` con un cliente nuevo y `retry: false` para que
 * los errores se manifiesten de inmediato y los tests no compartan caché.
 */

/**
 * Devuelve un `GeocodingResult` con valores razonables. Los tests
 * sobrescriben lo que necesitan vía `overrides`.
 */
function makeResult(overrides: Partial<GeocodingResult> = {}): GeocodingResult {
  const base: GeocodingResult = {
    id: 'addr-1',
    name: 'Carrer de Mallorca 123',
    fullAddress: 'Carrer de Mallorca 123, 08036 Barcelona, España',
    lat: 41.39,
    lng: 2.16,
    kind: 'address',
  };
  return { ...base, ...overrides };
}

/**
 * Bloque de strings reutilizable en aserciones. Lo definimos antes para
 * poder leer `MESSAGES.addressAutocomplete.error` directamente sin
 * hacer narrowing del shape parcialmente tipado de `messages`.
 */
const MESSAGES = {
  addressAutocomplete: {
    placeholder: 'Introduce una dirección',
    loading: 'Buscando direcciones…',
    error: 'No hemos podido buscar direcciones.',
    no_results: 'Sin resultados',
    clear: 'Limpiar dirección',
  },
} as const;

/**
 * Mensajes para el provider de next-intl. Casteamos porque el namespace
 * `addressAutocomplete` aún no vive en `messages/es.json` (lo añade el
 * orquestador después). El cast desaparecerá en cuanto el JSON se
 * actualice y el tipo de `Messages` incluya el namespace.
 */
const messages = MESSAGES as unknown as Parameters<typeof NextIntlClientProvider>[0]['messages'];

interface HarnessProps {
  onSelect?: (s: AddressSelection) => void;
  onClear?: () => void;
}

function Harness({ onSelect = vi.fn(), onClear }: HarnessProps) {
  // Cliente nuevo por render para garantizar aislamiento entre tests.
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: { queries: { retry: false } },
      }),
  );
  return (
    <QueryClientProvider client={client}>
      <NextIntlClientProvider locale="es" messages={messages}>
        <AddressAutocomplete locale="es" country="es" onSelect={onSelect} onClear={onClear} />
      </NextIntlClientProvider>
    </QueryClientProvider>
  );
}

/**
 * Devuelve una respuesta `Response`-like válida para `fetch`. Evita
 * acoplarse a la implementación del `Response` global de happy-dom.
 */
function jsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as unknown as Response;
}

let fetchMock: Mock;

beforeEach(() => {
  fetchMock = vi.fn().mockResolvedValue(jsonResponse({ results: [makeResult()] }));
  // `vi.stubGlobal` es la API recomendada por Vitest para sustituir
  // globales del entorno y restaurarlos automáticamente entre tests.
  vi.stubGlobal('fetch', fetchMock);
});

describe('AddressAutocomplete', () => {
  it('renderiza el input con role combobox y listbox cerrado', () => {
    render(<Harness />);
    const input = screen.getByRole('combobox');

    expect(input).toHaveAttribute('aria-expanded', 'false');
    expect(input).toHaveAttribute('aria-autocomplete', 'list');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('no llama a fetch cuando hay menos de 3 caracteres', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.type(screen.getByRole('combobox'), 'ca');

    // Esperamos el debounce por si acaso; aun así no debe haber llamadas.
    await new Promise((resolve) => setTimeout(resolve, 400));
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('llama a /api/geocoding/forward con la query correcta tras el debounce', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.type(screen.getByRole('combobox'), 'mall');

    await waitFor(
      () => {
        expect(fetchMock).toHaveBeenCalled();
      },
      { timeout: 2000 },
    );

    const calledUrl = fetchMock.mock.calls[0][0] as string;
    expect(calledUrl).toContain('/api/geocoding/forward');
    expect(calledUrl).toContain('q=mall');
    expect(calledUrl).toContain('language=es');
    expect(calledUrl).toContain('country=es');
  });

  it('renderiza los resultados como options cuando llega la respuesta', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.type(screen.getByRole('combobox'), 'mall');

    // Esperamos directamente a que aparezcan las options para no caer
    // en el estado intermedio de "loading" dentro del listbox.
    await waitFor(
      () => {
        expect(screen.getAllByRole('option').length).toBeGreaterThan(0);
      },
      { timeout: 3000 },
    );

    const options = screen.getAllByRole('option');
    expect(options[0]).toHaveAttribute('aria-selected', 'true');
  });

  it('actualiza aria-activedescendant al pulsar ArrowDown', async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValue(
      jsonResponse({
        results: [makeResult({ id: 'a-1' }), makeResult({ id: 'a-2', name: 'Otra calle' })],
      }),
    );

    render(<Harness />);
    const input = screen.getByRole('combobox');
    await user.type(input, 'mall');

    await waitFor(
      () => {
        expect(screen.getAllByRole('option').length).toBeGreaterThan(1);
      },
      { timeout: 3000 },
    );

    const initialActive = input.getAttribute('aria-activedescendant');
    expect(initialActive).toBeTruthy();

    await user.keyboard('{ArrowDown}');

    await waitFor(() => {
      expect(input.getAttribute('aria-activedescendant')).not.toBe(initialActive);
    });
  });

  it('Enter sobre la opción activa llama a onSelect con el shape correcto', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<Harness onSelect={onSelect} />);

    const input = screen.getByRole('combobox');
    await user.type(input, 'mall');

    await waitFor(
      () => {
        expect(screen.getAllByRole('option').length).toBeGreaterThan(0);
      },
      { timeout: 3000 },
    );

    await user.keyboard('{Enter}');

    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith({
      fullAddress: 'Carrer de Mallorca 123, 08036 Barcelona, España',
      lat: 41.39,
      lng: 2.16,
      kind: 'address',
    });
  });

  it('Escape cierra el listbox', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    const input = screen.getByRole('combobox');
    await user.type(input, 'mall');

    await waitFor(
      () => {
        expect(screen.getByRole('listbox')).toBeInTheDocument();
      },
      { timeout: 2000 },
    );

    await user.keyboard('{Escape}');

    await waitFor(() => {
      expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    });
  });

  it('click sobre una opción dispara onSelect y cierra el listbox', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<Harness onSelect={onSelect} />);

    const input = screen.getByRole('combobox');
    await user.type(input, 'mall');

    await waitFor(
      () => {
        expect(screen.getAllByRole('option').length).toBeGreaterThan(0);
      },
      { timeout: 3000 },
    );

    const firstOption = screen.getAllByRole('option')[0];
    // `userEvent.click` dispara mousedown internamente, que es lo que el
    // componente escucha para evitar el cierre por blur.
    await user.click(firstOption);

    expect(onSelect).toHaveBeenCalledTimes(1);
    await waitFor(() => {
      expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    });
  });

  it('muestra mensaje de error cuando el fetch responde con 500', async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValueOnce(jsonResponse({ error: { code: 'BOOM' } }, 500));

    render(<Harness />);
    await user.type(screen.getByRole('combobox'), 'mall');

    await waitFor(
      () => {
        expect(screen.getByText(MESSAGES.addressAutocomplete.error)).toBeInTheDocument();
      },
      { timeout: 2000 },
    );
  });
});
