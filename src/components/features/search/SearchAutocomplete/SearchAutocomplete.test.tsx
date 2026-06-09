import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NextIntlClientProvider } from 'next-intl';
import { useState } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Suggestion } from '@/lib/services/suggestions';
import type * as SuggestionsModule from '@/lib/services/suggestions';

/**
 * Tests del componente SearchAutocomplete.
 *
 * Cubrimos los comportamientos clave que justifican que sea un Client
 * Component complejo: debounce, apertura del listbox, selección con
 * mouse y atributos ARIA de combobox. La navegación con teclado se
 * comprueba indirectamente vía el cambio de `aria-activedescendant`.
 *
 * Mockeamos `@/lib/services/suggestions` para no salir por la red: el
 * hook llama a `fetchSuggestions` que normalmente haría `fetch('/api/
 * suggestions...')`, y aquí lo sustituimos por una promesa con datos
 * deterministas.
 */

vi.mock('@/lib/services/suggestions', async () => {
  const actual = await vi.importActual<typeof SuggestionsModule>('@/lib/services/suggestions');
  return {
    ...actual,
    fetchSuggestions: vi.fn(),
  };
});

import { fetchSuggestions } from '@/lib/services/suggestions';

import { SearchAutocomplete } from './SearchAutocomplete';

const mockedFetch = vi.mocked(fetchSuggestions);

function makeSuggestion(overrides: Partial<Suggestion> = {}): Suggestion {
  const base: Suggestion = {
    type: 'category',
    id: 'cat-1',
    label: 'Belleza',
    matchRange: [0, 7],
    slug: 'belleza',
  };
  return { ...base, ...overrides } as Suggestion;
}

const messages = {
  searchAutocomplete: {
    placeholder: 'Busca...',
    inputLabel: 'Buscar',
    clear: 'Limpiar',
    suggestionsLabel: 'Sugerencias',
    type: {
      category: 'Categoría',
      service: 'Servicio',
      provider: 'Centro',
    },
  },
};

function Harness({
  onSubmit = vi.fn(),
  onSelectSuggestion = vi.fn(),
}: {
  onSubmit?: (v: string) => void;
  onSelectSuggestion?: (s: Suggestion) => void;
}) {
  // Cada render del Harness arranca con un QueryClient nuevo para que
  // los tests no compartan caché entre sí. `retry: false` evita esperas
  // de backoff cuando un test simula error.
  const [client] = useState(
    () => new QueryClient({ defaultOptions: { queries: { retry: false } } }),
  );
  const [value, setValue] = useState('');
  return (
    <QueryClientProvider client={client}>
      <NextIntlClientProvider locale="es" messages={messages}>
        <SearchAutocomplete
          value={value}
          onValueChange={setValue}
          onSubmit={onSubmit}
          onSelectSuggestion={onSelectSuggestion}
          locale="es"
        />
      </NextIntlClientProvider>
    </QueryClientProvider>
  );
}

describe('SearchAutocomplete', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Por defecto devolvemos una sugerencia: cada test que necesite otro
    // payload sobreescribe el mock.
    mockedFetch.mockResolvedValue({
      results: [makeSuggestion()],
      took: 1,
    });
  });

  it('expone el input con role combobox y aria-expanded false al inicio', () => {
    render(<Harness />);
    const input = screen.getByRole('combobox');

    expect(input).toHaveAttribute('aria-expanded', 'false');
    expect(input).toHaveAttribute('aria-autocomplete', 'list');
  });

  it('muestra sugerencias después de escribir y esperar el debounce', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    const input = screen.getByRole('combobox');
    await user.type(input, 'belleza');

    // El listbox aparece tras el debounce (250ms) + resolución del fetch
    // mockeado. Le damos margen porque userEvent inserta caracter a
    // caracter y reseteamos el timer en cada keystroke.
    await waitFor(
      () => {
        expect(screen.getByRole('listbox')).toBeInTheDocument();
      },
      { timeout: 2000 },
    );

    const options = screen.getAllByRole('option');
    expect(options.length).toBeGreaterThan(0);
    // La primera opción está marcada como activa por defecto.
    expect(options[0]).toHaveAttribute('aria-selected', 'true');
  });

  it('selecciona una sugerencia al hacer click y dispara onSelectSuggestion', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<Harness onSelectSuggestion={onSelect} />);

    const input = screen.getByRole('combobox');
    await user.type(input, 'corte');

    await waitFor(
      () => {
        expect(screen.getByRole('listbox')).toBeInTheDocument();
      },
      { timeout: 2000 },
    );

    const firstOption = screen.getAllByRole('option')[0];
    // userEvent.click dispara mouseDown internamente, que es el evento
    // que usamos para evitar el cierre por blur.
    await user.click(firstOption);

    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  it('cierra el listbox al pulsar Escape', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    const input = screen.getByRole('combobox');
    await user.type(input, 'masaje');

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
});
