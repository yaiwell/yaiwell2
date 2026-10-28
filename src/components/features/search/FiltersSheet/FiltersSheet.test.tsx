import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { FiltersSheet } from './FiltersSheet';
import type { FiltersSheetProps } from './FiltersSheet.types';

/**
 * Tests del sheet de filtros avanzados, centrados en «Con descuento»:
 * en móvil vive aquí (en la barra no cabe a 375 px) y se aplica con el
 * resto del borrador; desde `md` el sheet no lo enseña ni lo limpia.
 */

const messages = {
  search: {
    filters: {
      title: 'Filtros avanzados',
      description: 'Afina tu búsqueda.',
      price: 'Precio',
      minRating: 'Valoración mínima',
      anyRating: 'Cualquiera',
      apply: 'Aplicar filtros',
      clear: 'Limpiar',
      close: 'Cerrar',
    },
    slotOffer: {
      filterToggle: 'Con descuento',
      sheetSectionLabel: 'Huecos liberados',
    },
  },
};

function renderSheet(overrides: Partial<FiltersSheetProps> = {}) {
  const props: FiltersSheetProps = {
    open: true,
    onOpenChange: vi.fn(),
    value: { priceRange: [], minRating: null, discountOnly: false },
    onApply: vi.fn(),
    onClear: vi.fn(),
    ...overrides,
  };
  render(
    <NextIntlClientProvider locale="es" messages={messages}>
      <FiltersSheet {...props} />
    </NextIntlClientProvider>,
  );
  return props;
}

/** Simula el ancho de pantalla: `true` = desde `md`. */
function mockViewport(isDesktop: boolean) {
  vi.spyOn(window, 'matchMedia').mockImplementation(
    (query: string) =>
      ({
        matches: isDesktop,
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }) as unknown as MediaQueryList,
  );
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('FiltersSheet — «Con descuento»', () => {
  it('la sección solo se enseña por debajo de md', () => {
    renderSheet();
    const section = document.querySelector('[data-component="filters-sheet-section-discount"]');
    expect(section?.className).toContain('md:hidden');
    expect(screen.getByText('Huecos liberados')).toBeInTheDocument();
  });

  it('refleja el filtro activo y lo aplica desde el borrador', async () => {
    const props = renderSheet();

    const toggle = screen.getByRole('button', { name: 'Con descuento' });
    expect(toggle).toHaveAttribute('aria-pressed', 'false');

    await userEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-pressed', 'true');
    // Como el resto del sheet: nada cambia hasta «Aplicar».
    expect(props.onApply).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole('button', { name: 'Aplicar filtros' }));
    expect(props.onApply).toHaveBeenCalledWith({
      priceRange: [],
      minRating: null,
      discountOnly: true,
    });
  });

  it('«Limpiar» en móvil incluye el descuento', async () => {
    mockViewport(false);
    const props = renderSheet({ value: { priceRange: [], minRating: null, discountOnly: true } });

    await userEvent.click(screen.getByRole('button', { name: 'Limpiar' }));
    expect(props.onClear).toHaveBeenCalledWith({ includeDiscount: true });
  });

  it('«Limpiar» desde md no toca el descuento, que vive en la barra', async () => {
    mockViewport(true);
    const props = renderSheet({ value: { priceRange: [], minRating: null, discountOnly: true } });

    await userEvent.click(screen.getByRole('button', { name: 'Limpiar' }));
    expect(props.onClear).toHaveBeenCalledWith({ includeDiscount: false });
  });
});
