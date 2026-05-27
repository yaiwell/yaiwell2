import { render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { describe, expect, it } from 'vitest';

import { AvailabilityBadge } from './AvailabilityBadge';

/**
 * Tests del componente AvailabilityBadge.
 *
 * Verificamos las tres variantes de estado (`available_now`,
 * `available_soon`, `busy`) cubriendo:
 *  - Texto visible (procedente del namespace i18n `search.availability`).
 *  - `aria-label` consistente con el texto para lectores de pantalla.
 *  - `data-component` con el sufijo correcto, que se usa para QA visual
 *    y para selectores de los tests E2E.
 *
 * Envolvemos cada render en `NextIntlClientProvider` con un subset de
 * los mensajes reales para evitar acoplarnos al fichero `es.json` entero.
 */
const messages = {
  search: {
    availability: {
      now: 'Disponible ahora',
      soon: 'En {minutes} min',
      busy: 'Sin hueco hoy',
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

describe('AvailabilityBadge', () => {
  it('muestra "Disponible ahora" para status available_now', () => {
    renderWithIntl(<AvailabilityBadge status="available_now" />);

    const badge = screen.getByRole('status');
    expect(badge).toHaveTextContent('Disponible ahora');
    expect(badge).toHaveAttribute('aria-label', 'Disponible ahora');
    expect(badge).toHaveAttribute('data-component', 'availability-badge-available-now');
  });

  it('muestra "En X min" interpolando los minutos para available_soon', () => {
    renderWithIntl(<AvailabilityBadge status="available_soon" minutesUntilNext={25} />);

    const badge = screen.getByRole('status');
    expect(badge).toHaveTextContent('En 25 min');
    expect(badge).toHaveAttribute('aria-label', 'En 25 min');
    expect(badge).toHaveAttribute('data-component', 'availability-badge-available-soon');
  });

  it('usa 0 minutos como fallback cuando minutesUntilNext no se pasa', () => {
    renderWithIntl(<AvailabilityBadge status="available_soon" />);

    expect(screen.getByRole('status')).toHaveTextContent('En 0 min');
  });

  it('muestra "Sin hueco hoy" para status busy', () => {
    renderWithIntl(<AvailabilityBadge status="busy" />);

    const badge = screen.getByRole('status');
    expect(badge).toHaveTextContent('Sin hueco hoy');
    expect(badge).toHaveAttribute('data-component', 'availability-badge-busy');
  });

  it('aplica clases distintas para las variantes solid y subtle', () => {
    const { rerender } = renderWithIntl(
      <AvailabilityBadge status="available_now" variant="subtle" />,
    );
    const subtleClass = screen.getByRole('status').className;

    rerender(
      <NextIntlClientProvider locale="es" messages={messages}>
        <AvailabilityBadge status="available_now" variant="solid" />
      </NextIntlClientProvider>,
    );
    const solidClass = screen.getByRole('status').className;

    // No comparamos la clase exacta (puede cambiar con redesigns), sino
    // que verificamos que las dos variantes producen estilos distintos.
    expect(subtleClass).not.toEqual(solidClass);
  });
});
