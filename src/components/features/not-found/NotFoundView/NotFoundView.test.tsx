import { render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import type { ComponentProps } from 'react';
import { describe, expect, it, vi } from 'vitest';

/**
 * Mockeamos `@/i18n/navigation` porque su implementación real importa
 * `next/navigation` con un especificador sin extensión que el resolver
 * de Vitest (Vite ESM) no consigue resolver dentro de happy-dom. Como
 * en el unit test solo nos interesa que los `Link` se rendericen con
 * el `href` correcto, sustituirlos por un `<a>` plano es suficiente y
 * mantiene la aserción pública del comportamiento.
 */
vi.mock('@/i18n/navigation', () => ({
  Link: ({ href, children, ...rest }: ComponentProps<'a'>) => (
    <a href={typeof href === 'string' ? href : '#'} {...rest}>
      {children}
    </a>
  ),
}));

import { NotFoundView } from './NotFoundView';

/**
 * Tests de la vista 404.
 *
 * Verificamos que se renderizan los textos clave de marca (eyebrow,
 * título, ambos CTAs) y que los enlaces apuntan a las rutas correctas
 * del marketplace (`/` y `/buscar`). Si en el futuro alguien cambia
 * el namespace o los destinos sin actualizar este test, la regresión
 * salta aquí.
 */
const messages = {
  notFound: {
    eyebrow: 'Error 404',
    title: 'Nos hemos perdido',
    subtitle: 'La página no existe.',
    illustrationAlt: 'Ilustración decorativa',
    backHome: 'Volver a inicio',
    exploreServices: 'Buscar servicios',
    helpHint: 'Escríbenos a hola@beauly.com.',
  },
};

function renderWithIntl(ui: React.ReactNode) {
  return render(
    <NextIntlClientProvider locale="es" messages={messages}>
      {ui}
    </NextIntlClientProvider>,
  );
}

describe('NotFoundView', () => {
  it('muestra eyebrow, título y subtítulo del namespace notFound', () => {
    renderWithIntl(<NotFoundView />);

    expect(screen.getByText('Error 404')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Nos hemos perdido');
    expect(screen.getByText('La página no existe.')).toBeInTheDocument();
  });

  it('expone el CTA primario como enlace a inicio', () => {
    renderWithIntl(<NotFoundView />);

    const backHome = screen.getByRole('link', { name: 'Volver a inicio' });
    expect(backHome).toHaveAttribute('href', '/');
    expect(backHome).toHaveAttribute('data-component', 'not-found-view-back-home');
  });

  it('expone el CTA secundario como enlace a /buscar', () => {
    renderWithIntl(<NotFoundView />);

    const explore = screen.getByRole('link', { name: 'Buscar servicios' });
    expect(explore).toHaveAttribute('href', '/buscar');
    expect(explore).toHaveAttribute('data-component', 'not-found-view-explore-services');
  });

  it('renderiza la ilustración con alt accesible', () => {
    renderWithIntl(<NotFoundView />);

    expect(screen.getByRole('img', { name: 'Ilustración decorativa' })).toBeInTheDocument();
  });
});
