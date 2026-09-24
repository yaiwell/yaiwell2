import { render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import type { ComponentProps } from 'react';
import { describe, expect, it, vi } from 'vitest';

/**
 * Mock de `@/i18n/navigation` por el mismo motivo que en
 * `NotFoundView.test.tsx`: Vitest no resuelve el `next/navigation` que
 * importa next-intl por dentro. Para estas aserciones basta con que el
 * `Link` se convierta en un `<a>` con su `href`.
 */
vi.mock('@/i18n/navigation', () => ({
  Link: ({ href, children, ...rest }: ComponentProps<'a'>) => (
    <a href={typeof href === 'string' ? href : '#'} {...rest}>
      {children}
    </a>
  ),
}));

import { Footer } from './Footer';

/**
 * Mensajes mínimos inline. Las claves `footer.contact`, y las columnas
 * retiradas (`company.*`, `legal.*`), no se declaran aquí a propósito:
 * el test debe fallar si alguien repone una columna sin destino real.
 */
const messages = {
  common: { appName: 'Yaiwell' },
  footer: {
    tagline: 'Belleza, bienestar y deporte con disponibilidad inmediata.',
    contact: 'Contacto',
    product: {
      title: 'Producto',
      howItWorks: 'Cómo funciona',
      categories: 'Categorías',
      pricing: 'Precios',
    },
    madeIn: 'Hecho en {city}',
    copyright: '© {year} Yaiwell',
  },
};

function renderFooter() {
  return render(
    <NextIntlClientProvider locale="es" messages={messages}>
      <Footer />
    </NextIntlClientProvider>,
  );
}

describe('Footer', () => {
  it('no deja ningún enlace apuntando a "#"', () => {
    const { container } = renderFooter();

    expect(container.querySelectorAll('a[href="#"]')).toHaveLength(0);
  });

  it('enlaza "Cómo funciona" a la sección de la landing', () => {
    renderFooter();

    expect(screen.getByRole('link', { name: 'Cómo funciona' })).toHaveAttribute(
      'href',
      '/#how-it-works',
    );
  });

  it('enlaza "Categorías" a la rejilla de la landing', () => {
    renderFooter();

    expect(screen.getByRole('link', { name: 'Categorías' })).toHaveAttribute(
      'href',
      '/#categories',
    );
  });

  it('enlaza "Precios" a la landing comercial, que es donde están los planes', () => {
    renderFooter();

    expect(screen.getByRole('link', { name: 'Precios' })).toHaveAttribute('href', '/profesionales');
  });

  it('expone el contacto como mailto con aria-label traducido', () => {
    renderFooter();

    expect(screen.getByRole('link', { name: 'Contacto' })).toHaveAttribute(
      'href',
      'mailto:hola@yaiwell.com',
    );
  });

  it('no publica columnas legales ni de empresa mientras sus destinos no existan', () => {
    renderFooter();

    expect(screen.queryByText('Términos')).toBeNull();
    expect(screen.queryByText('Privacidad')).toBeNull();
    expect(screen.queryByText('Cookies')).toBeNull();
    expect(screen.queryByText('Sobre nosotros')).toBeNull();
  });
});
