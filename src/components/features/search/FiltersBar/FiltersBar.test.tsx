import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NextIntlClientProvider } from 'next-intl';
import { describe, expect, it, vi } from 'vitest';

import { FiltersBar } from './FiltersBar';
import type { FiltersBarProps } from './FiltersBar.types';

/**
 * Tests de la barra de filtros.
 *
 * Lo importante: los chips salen de las props (datos de BD) y no de
 * `fake-data`, así que una categoría creada solo en BD debe aparecer.
 */
const messages = {
  search: {
    title: 'Buscar',
    nearMeChip: 'Cerca de ti',
    nearMeChipAria: 'Cerca de ti ({radius} km)',
    availableNowToggle: 'Disponibles ahora',
    filters: { button: 'Filtros' },
    categories: { all: 'Todas' },
  },
};

function renderBar(overrides: Partial<FiltersBarProps> = {}) {
  const props: FiltersBarProps = {
    categories: [
      { id: 'c1', slug: 'belleza', label: 'Belleza' },
      { id: 'c2', slug: 'mascotas', label: 'Mascotas' },
    ],
    activeCategorySlug: null,
    availabilityOnly: false,
    hasAdvancedFilters: false,
    nearMeOnly: false,
    nearMeRadiusKm: 5,
    onCategoryChange: vi.fn(),
    onAvailabilityToggle: vi.fn(),
    onNearMeToggle: vi.fn(),
    onOpenFiltersSheet: vi.fn(),
    ...overrides,
  };
  render(
    <NextIntlClientProvider locale="es" messages={messages}>
      <FiltersBar {...props} />
    </NextIntlClientProvider>,
  );
  return props;
}

describe('FiltersBar', () => {
  it('pinta un chip por categoría recibida, incluida una que solo existe en BD', () => {
    renderBar();

    const tabs = screen.getAllByRole('tab').map((t) => t.textContent);
    expect(tabs).toEqual(['Todas', 'Belleza', 'Mascotas']);
  });

  it('marca el chip activo y lo desactiva al volver a pulsarlo', async () => {
    const props = renderBar({ activeCategorySlug: 'mascotas' });

    const chip = screen.getByRole('tab', { name: 'Mascotas' });
    expect(chip).toHaveAttribute('aria-selected', 'true');

    await userEvent.click(chip);
    expect(props.onCategoryChange).toHaveBeenCalledWith(null);
  });

  it('selecciona una categoría inactiva por su slug', async () => {
    const props = renderBar();

    await userEvent.click(screen.getByRole('tab', { name: 'Belleza' }));
    expect(props.onCategoryChange).toHaveBeenCalledWith('belleza');
  });
});
