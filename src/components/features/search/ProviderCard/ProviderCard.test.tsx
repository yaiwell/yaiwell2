import { render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { describe, expect, it } from 'vitest';

import type { ProviderWithAvailability } from '@/types/domain';

import { ProviderCard } from './ProviderCard';

// Claves declaradas inline (patrón de ServiceDeleteButton.test.tsx).
// `noPhoto` es nueva: hay que añadirla a src/messages/*.json.
const messages = {
  ratingSummary: {
    new: 'Nuevo en Yaiwell',
    groupLabel: 'Valoración',
    reviews: '{count, plural, one {# valoración} other {# valoraciones}}',
  },
  search: {
    card: {
      from: 'desde',
      distance: 'a {km} km',
      distanceShort: 'a {distance}',
      distanceFromFallback: 'a {distance} *',
      distanceFromFallbackHint: 'Distancia estimada.',
      viewDetail: 'Ver detalle',
      typeAutonomous: 'Autónomo',
      typeCenter: 'Centro',
      noPhoto: 'Sin fotos',
    },
    availability: {
      now: 'Disponible ahora',
      soon: 'Libre en {minutes} min',
      nextSlot: 'Libre a las {time}',
      busy: 'Sin hueco hoy',
    },
  },
};

/** Proveedor mínimo con los campos que consume la card. */
function buildProvider(
  overrides: Partial<ProviderWithAvailability> = {},
): ProviderWithAvailability {
  return {
    id: 'prov-1',
    slug: 'estudio-lumen',
    name: 'Estudio Lumen',
    type: 'centro',
    description: { es: '', ca: '', en: '', de: '' },
    address: 'Carrer de Mallorca 120',
    location: { lat: 41.39, lng: 2.16 },
    photos: [],
    rating: 4.8,
    reviewsCount: 12,
    priceRange: '€€',
    categoryIds: [],
    availability: { status: 'busy', nextSlot: null },
    distanceKm: null,
    ...overrides,
  };
}

function renderCard(provider: ProviderWithAvailability) {
  return render(
    <NextIntlClientProvider locale="es" messages={messages}>
      <ProviderCard provider={provider} fromPriceCents={2500} />
    </NextIntlClientProvider>,
  );
}

describe('ProviderCard', () => {
  it('no lanza y pinta el placeholder cuando el proveedor no tiene fotos', () => {
    // El wizard de onboarding no tiene paso de fotos, así que
    // `photos = []` es el estado normal de todo centro recién creado.
    // Sin guarda, `next/image` recibía `src={undefined}` y tumbaba
    // /buscar entera.
    expect(() => renderCard(buildProvider({ photos: [] }))).not.toThrow();

    expect(
      document.querySelector('[data-component="provider-card-photo-placeholder"]'),
    ).not.toBeNull();
    expect(screen.getByText('Sin fotos')).toBeInTheDocument();
    expect(document.querySelectorAll('img')).toHaveLength(0);
  });

  it('sigue mostrando el resto de la card sin fotos', () => {
    renderCard(buildProvider({ photos: [] }));

    expect(screen.getByText('Estudio Lumen')).toBeInTheDocument();
    expect(screen.getByText('Carrer de Mallorca 120')).toBeInTheDocument();
  });

  it('pinta la foto de portada cuando existe', () => {
    renderCard(buildProvider({ photos: ['https://images.unsplash.com/photo-1.jpg'] }));

    expect(document.querySelector('[data-component="provider-card-photo-placeholder"]')).toBeNull();
    expect(screen.getByAltText('Estudio Lumen')).toBeInTheDocument();
  });

  it('pinta «Nuevo en Yaiwell» y ninguna cifra si el centro no tiene reseñas', () => {
    renderCard(buildProvider({ rating: 0, reviewsCount: 0 }));

    const rating = document.querySelector('[data-component="provider-card-rating"]');
    expect(rating).toHaveTextContent('Nuevo en Yaiwell');
    expect(rating).not.toHaveTextContent(/\d/);
    expect(screen.queryByText(/0[.,]0/)).toBeNull();
  });

  it('pinta la nota y el número de reseñas cuando las hay', () => {
    renderCard(buildProvider({ rating: 4.8, reviewsCount: 12 }));

    expect(screen.getByText('4,8')).toBeInTheDocument();
    expect(screen.getByText('12 valoraciones')).toBeInTheDocument();
    expect(screen.queryByText('Nuevo en Yaiwell')).toBeNull();
  });
});
