import { render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { describe, expect, it } from 'vitest';

import { RatingSummary } from './RatingSummary';
import type { RatingSummaryProps } from './RatingSummary.types';

const messages = {
  ratingSummary: {
    new: 'Nuevo en Yaiwell',
    groupLabel: 'Valoración',
    reviews: '{count, plural, one {# valoración} other {# valoraciones}}',
  },
};

function renderSummary(props: RatingSummaryProps, locale: 'es' | 'en' = 'es') {
  return render(
    <NextIntlClientProvider locale={locale} messages={messages}>
      <RatingSummary dataComponent="rating" {...props} />
    </NextIntlClientProvider>,
  );
}

function root(): HTMLElement {
  const el = document.querySelector<HTMLElement>('[data-component="rating"]');
  if (!el) throw new Error('RatingSummary root not found');
  return el;
}

describe('RatingSummary', () => {
  it.each(['header', 'card', 'popup'] as const)(
    'con 0 reseñas pinta «Nuevo en Yaiwell» y ninguna cifra (%s)',
    (variant) => {
      renderSummary({ ratingAvg: 0, reviewsCount: 0, variant });

      expect(root()).toHaveTextContent('Nuevo en Yaiwell');
      expect(root()).toHaveAttribute('data-state', 'new');
      expect(root()).not.toHaveTextContent(/\d/);
    },
  );

  it('ignora una media inventada si el contador está a 0', () => {
    renderSummary({ ratingAvg: 4.8, reviewsCount: 0 });

    expect(screen.queryByText(/4[.,]8/)).toBeNull();
    expect(screen.getByText('Nuevo en Yaiwell')).toBeInTheDocument();
  });

  it('con reseñas pinta la nota y el contador', () => {
    renderSummary({ ratingAvg: 4.6, reviewsCount: 12, variant: 'header' });

    expect(screen.getByRole('group', { name: 'Valoración' })).toBe(root());
    expect(screen.getByText('4,6')).toBeInTheDocument();
    expect(screen.getByText('12 valoraciones')).toBeInTheDocument();
    expect(screen.queryByText('Nuevo en Yaiwell')).toBeNull();
  });

  it('usa el singular con una sola reseña', () => {
    renderSummary({ ratingAvg: 5, reviewsCount: 1 });

    expect(screen.getByText('5,0')).toBeInTheDocument();
    expect(screen.getByText('1 valoración')).toBeInTheDocument();
  });

  it('solo el popup pinta el separador «·»', () => {
    const { unmount } = renderSummary({ ratingAvg: 4.2, reviewsCount: 3, variant: 'popup' });
    expect(root()).toHaveTextContent('·');
    unmount();

    renderSummary({ ratingAvg: 4.2, reviewsCount: 3, variant: 'card' });
    expect(root()).not.toHaveTextContent('·');
  });

  it('formatea el decimal según el idioma', () => {
    renderSummary({ ratingAvg: 4.6, reviewsCount: 12 }, 'en');

    expect(screen.getByText('4.6')).toBeInTheDocument();
  });
});
