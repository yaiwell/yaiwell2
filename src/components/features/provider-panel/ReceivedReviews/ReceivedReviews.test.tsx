import { render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { describe, expect, it } from 'vitest';

import es from '@/messages/es.json';

import { ReceivedReviews } from './ReceivedReviews';
import { getPanelRatingSummary } from './ReceivedReviews.logic';
import type { PanelReview } from './ReceivedReviews.types';

function buildReview(id: string, rating: PanelReview['rating']): PanelReview {
  return {
    id,
    authorName: 'Marta G.',
    rating,
    text: 'Muy bien.',
    serviceName: 'Corte',
    createdAt: new Date('2026-10-01T10:00:00.000Z'),
    providerResponse: null,
  };
}

describe('getPanelRatingSummary', () => {
  it('sin reseñas no hay resumen', () => {
    expect(getPanelRatingSummary([], 'es')).toBeNull();
  });

  it('redondea la mitad hacia arriba como el trigger SQL y formatea por idioma', () => {
    // 17 / 4 = 4.25 → 4.3
    const reviews = [
      buildReview('a', 5),
      buildReview('b', 4),
      buildReview('c', 4),
      buildReview('d', 4),
    ];
    expect(getPanelRatingSummary(reviews, 'es')).toEqual({ rating: '4,3', count: 4 });
    expect(getPanelRatingSummary(reviews, 'en')).toEqual({ rating: '4.3', count: 4 });
  });
});

describe('ReceivedReviews', () => {
  it('con 0 reseñas no pinta «0 sobre 5 · 0 valoraciones»', () => {
    render(
      <NextIntlClientProvider locale="es" messages={es}>
        <ReceivedReviews reviews={[]} locale="es" />
      </NextIntlClientProvider>,
    );

    expect(document.querySelector('[data-component="received-reviews-summary"]')).toBeNull();
    expect(screen.queryByText(/sobre 5/)).toBeNull();
    expect(document.querySelector('[data-component="received-reviews-empty"]')).not.toBeNull();
  });
});
