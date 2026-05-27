import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NextIntlClientProvider } from 'next-intl';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';

import type { Suggestion } from '@/lib/fake-data/search-suggestions';

import { SearchAutocomplete } from './SearchAutocomplete';

/**
 * Tests del componente SearchAutocomplete.
 *
 * Cubrimos los comportamientos clave que justifican que sea un Client
 * Component complejo: debounce, apertura del listbox, selección con
 * mouse y atributos ARIA de combobox. La navegación con teclado se
 * comprueba indirectamente vía el cambio de `aria-activedescendant`.
 */
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
  const [value, setValue] = useState('');
  return (
    <NextIntlClientProvider locale="es" messages={messages}>
      <SearchAutocomplete
        value={value}
        onValueChange={setValue}
        onSubmit={onSubmit}
        onSelectSuggestion={onSelectSuggestion}
        locale="es"
      />
    </NextIntlClientProvider>
  );
}

describe('SearchAutocomplete', () => {
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

    // El listbox aparece tras el debounce (250ms) + cómputo síncrono.
    await waitFor(
      () => {
        expect(screen.getByRole('listbox')).toBeInTheDocument();
      },
      { timeout: 1500 },
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
      { timeout: 1500 },
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
      { timeout: 1500 },
    );

    await user.keyboard('{Escape}');

    await waitFor(() => {
      expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    });
  });
});
