import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NextIntlClientProvider } from 'next-intl';
import { describe, expect, it, vi } from 'vitest';

import { ActiveFiltersChips } from './ActiveFiltersChips';
import type { ActiveFiltersState } from './ActiveFiltersChips.types';

/**
 * Tests del componente ActiveFiltersChips.
 *
 * Cubrimos:
 *  - No renderiza nada si no hay filtros activos.
 *  - Pinta un chip por cada filtro activo y dispara onRemove con el chip
 *    correcto al pulsar la X.
 *  - Muestra "Limpiar todo" solo cuando hay más de un chip.
 */
const messages = {
  searchFilters: {
    chips: {
      groupLabel: 'Filtros activos',
      queryLabel: 'Texto: {value}',
      availabilityLabel: 'Disponibles ahora',
      priceLabel: 'Precio {value}',
      ratingLabel: '{value}+ estrellas',
      clearAll: 'Limpiar todo',
      removeAria: 'Quitar {label}',
    },
  },
};

function renderWithIntl(ui: React.ReactNode) {
  return render(
    <NextIntlClientProvider locale="es" messages={messages}>
      {ui}
    </NextIntlClientProvider>,
  );
}

const emptyState: ActiveFiltersState = {
  query: '',
  categorySlug: null,
  availabilityOnly: false,
  priceRange: [],
  minRating: null,
};

describe('ActiveFiltersChips', () => {
  it('no renderiza nada cuando no hay filtros activos', () => {
    const { container } = renderWithIntl(
      <ActiveFiltersChips
        filters={emptyState}
        categoryLabel={null}
        onRemove={vi.fn()}
        onClearAll={vi.fn()}
      />,
    );

    expect(container.firstChild).toBeNull();
  });

  it('dispara onRemove con el chip correcto al pulsar la X', async () => {
    const onRemove = vi.fn();
    const user = userEvent.setup();

    renderWithIntl(
      <ActiveFiltersChips
        filters={{ ...emptyState, availabilityOnly: true }}
        categoryLabel={null}
        onRemove={onRemove}
        onClearAll={vi.fn()}
      />,
    );

    const removeBtn = screen.getByLabelText('Quitar Disponibles ahora');
    await user.click(removeBtn);

    expect(onRemove).toHaveBeenCalledTimes(1);
    expect(onRemove).toHaveBeenCalledWith({ kind: 'availability' });
  });

  it('muestra "Limpiar todo" solo si hay más de un chip', () => {
    const { rerender } = renderWithIntl(
      <ActiveFiltersChips
        filters={{ ...emptyState, availabilityOnly: true }}
        categoryLabel={null}
        onRemove={vi.fn()}
        onClearAll={vi.fn()}
      />,
    );

    expect(screen.queryByText('Limpiar todo')).not.toBeInTheDocument();

    rerender(
      <NextIntlClientProvider locale="es" messages={messages}>
        <ActiveFiltersChips
          filters={{ ...emptyState, availabilityOnly: true, priceRange: ['€€'] }}
          categoryLabel={null}
          onRemove={vi.fn()}
          onClearAll={vi.fn()}
        />
      </NextIntlClientProvider>,
    );

    expect(screen.getByText('Limpiar todo')).toBeInTheDocument();
  });

  it('dispara onClearAll cuando se pulsa "Limpiar todo"', async () => {
    const onClearAll = vi.fn();
    const user = userEvent.setup();

    renderWithIntl(
      <ActiveFiltersChips
        filters={{ ...emptyState, query: 'masaje', availabilityOnly: true }}
        categoryLabel={null}
        onRemove={vi.fn()}
        onClearAll={onClearAll}
      />,
    );

    await user.click(screen.getByText('Limpiar todo'));

    expect(onClearAll).toHaveBeenCalledTimes(1);
  });
});
