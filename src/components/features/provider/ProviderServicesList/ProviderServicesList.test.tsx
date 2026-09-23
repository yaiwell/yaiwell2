import { render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { describe, expect, it } from 'vitest';

import type { ServiceWithRootCategory } from '@/types/domain';

import { ProviderServicesList } from './ProviderServicesList';

/**
 * Test de regresión a nivel de render: la ficha debe pintar el epígrafe
 * de la categoría raíz real ("Belleza"), no el epígrafe de fallback.
 *
 * Los ids son UUID como en BD. Con la agrupación anterior (lookup
 * contra `fake-data`) este test fallaría: todos los servicios caían
 * bajo el epígrafe de fallback, que ahora sale de i18n y no de un
 * ternario por locale (servía castellano en EN y DE).
 *
 * Las claves i18n se declaran inline (patrón de `ServiceDeleteButton.test.tsx`)
 * para no acoplar el test al contenido real de `src/messages/*.json`.
 */

const messages = {
  providerDetail: {
    services: {
      title: 'Carta de servicios',
      subtitle: 'Elige el servicio que más se ajuste a lo que buscas.',
      duration: '{minutes} min',
      empty: 'Este centro aún no tiene servicios publicados.',
      groupHeader: '{category}',
      groupHeaderFallback: 'Otros servicios',
      cardHint: 'Pulsa para ver detalles',
      sheet: {
        title: 'Reservar este servicio',
        subtitle: 'Revisa los detalles antes de continuar.',
        close: 'Cerrar',
        reserveCta: 'Reservar',
      },
    },
  },
};

const BEAUTY_ROOT = {
  id: '3f2a1b0c-9d8e-4f7a-8b6c-5d4e3f2a1b0c',
  slug: 'belleza',
  name: { es: 'Belleza', ca: 'Bellesa' },
};

const haircut: ServiceWithRootCategory = {
  id: 'c9d8e7f6-a5b4-4332-9110-ffeeddccbbaa',
  providerId: 'a0b1c2d3-e4f5-4061-8273-8495a6b7c8d9',
  professionalId: null,
  categoryId: 'd1c2b3a4-e5f6-4708-9a1b-2c3d4e5f6071',
  name: { es: 'Corte de pelo', ca: 'Tall de cabell' },
  description: { es: 'Corte y peinado.', ca: 'Tall i pentinat.' },
  durationMinutes: 45,
  priceCents: 3500,
  rootCategory: BEAUTY_ROOT,
};

function renderList(services: ServiceWithRootCategory[]) {
  return render(
    <NextIntlClientProvider locale="es" messages={messages}>
      <ProviderServicesList services={services} locale="es" providerSlugWithId="centro-belleza-1" />
    </NextIntlClientProvider>,
  );
}

describe('ProviderServicesList', () => {
  it('agrupa bajo el nombre de la categoría raíz de BD, no bajo el fallback', () => {
    renderList([haircut]);

    expect(screen.getByRole('heading', { name: 'Belleza' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Otros servicios' })).not.toBeInTheDocument();
  });

  it('usa el epígrafe de fallback solo cuando la categoría es huérfana', () => {
    renderList([{ ...haircut, rootCategory: null }]);

    expect(screen.getByRole('heading', { name: 'Otros servicios' })).toBeInTheDocument();
  });

  it('no anuncia la reserva como "próximamente": el checkout ya cobra', () => {
    renderList([haircut]);

    expect(screen.queryByText(/próximamente/i)).not.toBeInTheDocument();
  });
});
