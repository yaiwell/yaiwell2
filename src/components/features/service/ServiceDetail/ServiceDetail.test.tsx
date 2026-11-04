import { render, screen, within } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import type { ComponentProps } from 'react';
import { describe, expect, it, vi } from 'vitest';

import type { Provider, Service } from '@/types/domain';

/**
 * Igual que en `NotFoundView.test.tsx`: el `Link` localizado de
 * `next-intl` arrastra `next/navigation`, que el resolver de Vitest
 * no localiza desde el entorno happy-dom. Sustituirlo por un `<a>`
 * plano nos basta para asertar `href` y `data-component` en este test.
 */
vi.mock('@/i18n/navigation', () => ({
  Link: ({ href, children, ...rest }: ComponentProps<'a'>) => (
    <a href={typeof href === 'string' ? href : '#'} {...rest}>
      {children}
    </a>
  ),
}));

import { ServiceDetail } from './ServiceDetail';

/**
 * Tests de la ficha de servicio individual.
 *
 * Cubrimos las dos ramas visibles diferenciadas:
 *  - Sin nadie que lo preste → muestra "cualquier profesional".
 *  - Con profesionales → «Quién lo presta» con nombre, bio y foto, y el
 *    aviso de que se elige al reservar cuando hay varios.
 *
 * También verificamos que:
 *  - El breadcrumb final usa el nombre del servicio en el locale activo.
 *  - El CTA "Reservar" apunta exactamente al `reserveHref` recibido,
 *    porque la página delega la construcción de esa URL en este prop.
 *  - El precio se formatea en euros y se muestra en el panel lateral.
 */
const messages = {
  serviceDetail: {
    breadcrumb: { home: 'Inicio', search: 'Buscar' },
    header: {
      eyebrow: 'Servicio',
      durationLabel: 'Duración',
      priceLabel: 'Precio',
      anyProfessional: 'Cualquier profesional disponible del centro',
    },
    description: { title: 'Sobre este servicio' },
    team: {
      title: 'Quién lo presta',
      chooseHint: 'Podrás elegir quién te atiende al reservar.',
    },
    policy: {
      title: 'Antes de reservar',
      cancellationTitle: 'Cancelación flexible',
      cancellationBody: 'Cancela hasta 2 horas antes.',
      punctualityTitle: 'Llega 5 minutos antes',
      punctualityBody: 'Para empezar puntual.',
      paymentTitle: 'Pago seguro online',
      paymentBody: 'Sin sorpresas en el centro.',
      ratingHint: 'Solo podrás valorar tras completar el servicio.',
    },
    cta: {
      reserve: 'Reservar',
      fromPrice: 'desde {price}',
      secureNote: 'Confirmación inmediata. Pago seguro.',
    },
  },
};

const provider: Provider = {
  id: 'prov-01',
  slug: 'atelier-norte',
  name: 'Atelier Norte',
  type: 'centro',
  description: { es: 'desc es', ca: 'desc ca' },
  address: 'Carrer Test 1',
  location: { lat: 41.39, lng: 2.16 },
  photos: ['https://example.com/photo.jpg'],
  rating: 4.8,
  reviewsCount: 100,
  priceRange: '€€€',
  categoryIds: ['cat-hair'],
};

const service: Service = {
  id: 'svc-01',
  providerId: 'prov-01',
  categoryId: 'cat-hair-cut',
  name: { es: 'Corte mujer', ca: 'Tall dona' },
  description: {
    es: 'Diagnóstico, lavado con productos botánicos y corte personalizado.',
    ca: 'Diagnòstic, rentat amb productes botànics i tall personalitzat.',
  },
  durationMinutes: 60,
  priceCents: 5500,
};

function renderWithIntl(ui: React.ReactNode, locale: 'es' | 'ca' | 'en' | 'de' | 'fr' = 'es') {
  return render(
    <NextIntlClientProvider locale={locale} messages={messages}>
      {ui}
    </NextIntlClientProvider>,
  );
}

describe('ServiceDetail', () => {
  it('muestra el título del servicio en el locale activo y el nombre del centro', () => {
    renderWithIntl(
      <ServiceDetail
        provider={provider}
        service={service}
        professionals={[]}
        locale="es"
        reserveHref="/centro/atelier-norte-prov-01/reservar?serviceId=svc-01"
        providerSlugWithId="atelier-norte-prov-01"
      />,
    );

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Corte mujer');
    // El nombre del centro aparece dos veces (breadcrumb + línea bajo el
    // título). Apuntamos al `data-component` específico de la línea para
    // evitar la ambigüedad y asegurar que ese enlace lleva a la ficha.
    const providerLink = document.querySelector(
      '[data-component="service-detail-provider-link"]',
    ) as HTMLAnchorElement | null;
    expect(providerLink).not.toBeNull();
    expect(providerLink?.getAttribute('href')).toBe('/centro/atelier-norte-prov-01');
    expect(providerLink?.textContent).toBe('Atelier Norte');
  });

  it('muestra el fallback "cualquier profesional" cuando nadie presta el servicio', () => {
    renderWithIntl(
      <ServiceDetail
        provider={provider}
        service={service}
        professionals={[]}
        locale="es"
        reserveHref="/r"
        providerSlugWithId="atelier-norte-prov-01"
      />,
    );

    const block = screen.getByRole('region', { name: 'Quién lo presta' });
    expect(
      within(block).getByText('Cualquier profesional disponible del centro'),
    ).toBeInTheDocument();
    expect(block.querySelector('img')).toBeNull();
  });

  it('muestra quién lo presta: nombre, bio, foto e iniciales, y el aviso de elegir', () => {
    renderWithIntl(
      <ServiceDetail
        provider={provider}
        service={service}
        professionals={[
          {
            id: 'pro-01',
            name: 'Laia Vidal',
            photo: 'https://example.com/laia.jpg',
            bio: 'Estilista senior',
          },
          { id: 'pro-02', name: 'Marc Soler', photo: null, bio: null },
        ]}
        locale="es"
        reserveHref="/r"
        providerSlugWithId="atelier-norte-prov-01"
      />,
    );

    const block = screen.getByRole('region', { name: 'Quién lo presta' });
    expect(within(block).getByText('Laia Vidal')).toBeInTheDocument();
    expect(within(block).getByText('Estilista senior')).toBeInTheDocument();
    expect(within(block).getByText('Marc Soler')).toBeInTheDocument();
    // Sin foto: iniciales en el avatar (decorativo).
    expect(within(block).getByText('MS')).toBeInTheDocument();
    const photo = block.querySelector('img') as HTMLImageElement | null;
    expect(photo?.src).toBe('https://example.com/laia.jpg');
    expect(
      within(block).getByText('Podrás elegir quién te atiende al reservar.'),
    ).toBeInTheDocument();
  });

  it('formatea el precio en euros y enlaza el CTA al reserveHref recibido', () => {
    renderWithIntl(
      <ServiceDetail
        provider={provider}
        service={service}
        professionals={[]}
        locale="es"
        reserveHref="/centro/atelier-norte-prov-01/reservar?serviceId=svc-01"
        providerSlugWithId="atelier-norte-prov-01"
      />,
    );

    const panel = screen.getByRole('link', { name: 'Reservar' });
    expect(panel).toHaveAttribute(
      'href',
      '/centro/atelier-norte-prov-01/reservar?serviceId=svc-01',
    );

    // Precio redondo → se muestra sin decimales (55 €). El símbolo y el
    // separador exacto dependen del entorno Intl, así que aceptamos
    // ambos formatos comunes en es-ES (NBSP o espacio normal).
    const ctaPanel = screen.getByText('Duración').closest('div')?.parentElement?.parentElement;
    expect(ctaPanel).not.toBeNull();
    expect(ctaPanel?.textContent).toMatch(/55\s?€/);
    expect(ctaPanel?.textContent).toContain('60 min');
  });

  it('renderiza el nombre del servicio en catalán cuando locale=ca', () => {
    renderWithIntl(
      <ServiceDetail
        provider={provider}
        service={service}
        professionals={[]}
        locale="ca"
        reserveHref="/r"
        providerSlugWithId="atelier-norte-prov-01"
      />,
      'ca',
    );

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Tall dona');
  });
});
