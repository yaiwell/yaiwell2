import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ComponentProps } from 'react';
import { describe, expect, it, vi } from 'vitest';

/**
 * Mockeamos `@/i18n/navigation` por el mismo motivo que en
 * `NotFoundView.test.tsx`: su implementación real importa
 * `next/navigation` con un especificador sin extensión que el resolver
 * de Vitest no resuelve dentro de happy-dom. Nos basta con comprobar
 * que el CTA secundario se pinta como enlace con el `href` correcto.
 */
vi.mock('@/i18n/navigation', () => ({
  Link: ({ href, children, ...rest }: ComponentProps<'a'>) => (
    <a href={typeof href === 'string' ? href : '#'} {...rest}>
      {children}
    </a>
  ),
}));

import { ErrorView } from './ErrorView';

/**
 * Tests de la pantalla de error compartida por los boundaries.
 *
 * Cubren lo que rompería la utilidad del componente: que el usuario vea
 * un titular, que pueda reintentar (el CTA que dispara `unstable_retry`
 * o `reset`), que tenga una salida hacia otra pantalla y que el digest
 * aparezca solo cuando Next lo proporciona.
 */
const baseProps = {
  title: 'Algo se ha roto por nuestro lado',
  description: 'No hemos podido cargar esta página.',
  retryLabel: 'Reintentar',
  digestLabel: 'Código de error',
  onRetry: () => {},
};

describe('ErrorView', () => {
  it('anuncia el error como alerta con título y descripción', () => {
    render(<ErrorView {...baseProps} />);

    const alert = screen.getByRole('alert');
    expect(alert).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'Algo se ha roto por nuestro lado',
    );
    expect(screen.getByText('No hemos podido cargar esta página.')).toBeInTheDocument();
  });

  it('invoca onRetry al pulsar el CTA primario', async () => {
    const onRetry = vi.fn();
    const user = userEvent.setup();

    render(<ErrorView {...baseProps} onRetry={onRetry} />);
    await user.click(screen.getByRole('button', { name: 'Reintentar' }));

    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('pinta el CTA secundario como enlace al destino indicado', () => {
    render(<ErrorView {...baseProps} secondaryLabel="Volver a inicio" secondaryHref="/" />);

    expect(screen.getByRole('link', { name: 'Volver a inicio' })).toHaveAttribute('href', '/');
  });

  it('omite el CTA secundario si no se le da destino', () => {
    render(<ErrorView {...baseProps} secondaryLabel="Volver a inicio" />);

    expect(screen.queryByRole('link')).toBeNull();
  });

  it('muestra el digest solo cuando Next lo proporciona', () => {
    const { rerender } = render(<ErrorView {...baseProps} />);
    expect(screen.queryByText(/Código de error/)).toBeNull();

    rerender(<ErrorView {...baseProps} digest="a1b2c3" />);
    expect(screen.getByText('Código de error: a1b2c3')).toBeInTheDocument();
  });
});
