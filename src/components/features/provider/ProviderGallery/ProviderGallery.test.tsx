import { render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { describe, expect, it } from 'vitest';

import { ProviderGallery } from './ProviderGallery';

// Claves declaradas inline (patrón de ServiceDeleteButton.test.tsx).
// `noPhotos` es nueva: hay que añadirla a src/messages/*.json.
const messages = {
  providerGallery: {
    galleryLabel: 'Galería de fotos',
    prev: 'Foto anterior',
    next: 'Foto siguiente',
    goToPhoto: 'Ir a la foto {index}',
    viewPhoto: 'Ver foto {index}',
    noPhotos: 'Este centro aún no ha subido fotos',
  },
};

function renderGallery(photos: string[]) {
  return render(
    <NextIntlClientProvider locale="es" messages={messages}>
      <ProviderGallery photos={photos} alt="Estudio Lumen" />
    </NextIntlClientProvider>,
  );
}

describe('ProviderGallery', () => {
  it('no lanza y pinta el placeholder cuando el proveedor no tiene fotos', () => {
    // Estado normal de todo centro recién dado de alta: el wizard de
    // onboarding todavía no tiene paso de fotos.
    expect(() => renderGallery([])).not.toThrow();

    expect(
      document.querySelector('[data-component="provider-gallery-placeholder"]'),
    ).not.toBeNull();
    expect(screen.getByText('Este centro aún no ha subido fotos')).toBeInTheDocument();
    expect(document.querySelectorAll('img')).toHaveLength(0);
  });

  it('no pinta controles de navegación cuando no hay fotos', () => {
    // Flechas, dots y miniaturas no llevarían a ninguna parte.
    renderGallery([]);

    expect(screen.queryByLabelText('Foto anterior')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Foto siguiente')).not.toBeInTheDocument();
    expect(document.querySelector('[data-component="provider-gallery-thumb-0"]')).toBeNull();
  });

  it('mantiene la región accesible etiquetada en el estado vacío', () => {
    renderGallery([]);

    expect(screen.getByRole('region', { name: 'Galería de fotos' })).toBeInTheDocument();
  });

  it('pinta las fotos y sus controles cuando el proveedor sí tiene', () => {
    renderGallery([
      'https://images.unsplash.com/photo-1.jpg',
      'https://images.unsplash.com/photo-2.jpg',
      'https://images.unsplash.com/photo-3.jpg',
    ]);

    expect(document.querySelector('[data-component="provider-gallery-placeholder"]')).toBeNull();
    expect(screen.getByLabelText('Foto siguiente')).toBeInTheDocument();
    expect(document.querySelector('[data-component="provider-gallery-thumb-0"]')).not.toBeNull();
    expect(document.querySelectorAll('img').length).toBeGreaterThan(0);
  });
});
