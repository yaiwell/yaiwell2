import { render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { describe, expect, it } from 'vitest';

import type { Review } from '@/types/domain';

import { ProviderReviewsSection } from './ProviderReviewsSection';
import type { RatingBreakdown } from './ProviderReviewsSection.types';

// Declaramos las claves inline (patrón de ServiceDeleteButton.test.tsx)
// para no acoplar el test al contenido real de src/messages.
const messages = {
  providerDetail: {
    reviews: {
      title: 'Opiniones',
      summary: '{rating} sobre 5 · {count, plural, one {# valoración} other {# valoraciones}}',
      breakdownLabel: '{stars} estrellas',
      empty: 'Aún no hay reseñas. Sé el primero en valorar este centro.',
      loadMore: 'Leer más opiniones',
      collapse: 'Ver menos',
    },
  },
};

/** Construye una reseña mínima con los campos que pinta el componente. */
function buildReview(overrides: Partial<Review> = {}): Review {
  return {
    id: 'rev-1',
    providerId: 'prov-1',
    authorName: 'Marta G.',
    rating: 5,
    text: 'Trato excelente.',
    createdAt: new Date('2026-09-01T10:00:00.000Z'),
    ...overrides,
  };
}

function renderSection(args: {
  reviews: Review[];
  reviewsCount: number;
  breakdown: RatingBreakdown;
}) {
  return render(
    <NextIntlClientProvider locale="es" messages={messages}>
      <ProviderReviewsSection
        reviews={args.reviews}
        ratingAvg={5}
        reviewsCount={args.reviewsCount}
        ratingBreakdown={args.breakdown}
        locale="es"
      />
    </NextIntlClientProvider>,
  );
}

describe('ProviderReviewsSection', () => {
  it('pinta la barra al 100% cuando todas las reseñas tienen la misma nota', () => {
    // Regresión del P1: el desglose llega agregado sobre las 40 reseñas
    // reales; antes venía de la muestra de 20 y la barra salía al 50%.
    renderSection({
      reviews: [buildReview()],
      reviewsCount: 40,
      breakdown: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 40 },
    });

    const bar = document.querySelector('[data-component="provider-reviews-breakdown-5"]');
    expect(bar).not.toBeNull();
    expect(bar?.querySelector('[role="progressbar"]')?.getAttribute('aria-valuenow')).toBe('100');
    expect(bar?.textContent).toContain('40');
  });

  it('reparte los porcentajes entre las distintas notas', () => {
    renderSection({
      reviews: [buildReview()],
      reviewsCount: 10,
      breakdown: { 1: 0, 2: 0, 3: 1, 4: 4, 5: 5 },
    });

    const valueOf = (stars: number) =>
      document
        .querySelector(
          `[data-component="provider-reviews-breakdown-${stars}"] [role="progressbar"]`,
        )
        ?.getAttribute('aria-valuenow');

    expect(valueOf(5)).toBe('50');
    expect(valueOf(4)).toBe('40');
    expect(valueOf(3)).toBe('10');
    expect(valueOf(1)).toBe('0');
  });

  it('muestra el estado vacío sin dividir entre cero cuando no hay reseñas', () => {
    renderSection({
      reviews: [],
      reviewsCount: 0,
      breakdown: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
    });

    expect(
      screen.getByText('Aún no hay reseñas. Sé el primero en valorar este centro.'),
    ).toBeInTheDocument();
    expect(document.querySelector('[data-component="provider-reviews-summary"]')).toBeNull();
  });
});
