import { render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { describe, expect, it } from 'vitest';

import type { AdminVerificationRequest } from '@/lib/fake-data/admin-verifications';

import { VerificationsQueue } from './VerificationsQueue';

/**
 * Tests de la cola de verificaciones del panel admin.
 *
 * Cubrimos:
 *  - Lista no vacía: pinta una fila por solicitud, con enlace a la
 *    ficha de detalle correspondiente.
 *  - Lista vacía: pinta el mensaje empty en lugar del listado.
 *  - El badge de tipo cambia según `providerType`.
 */

const messages = {
  adminArea: {
    verifications: {
      type: { centro: 'Centro', autonomo: 'Autónomo' },
      queue: {
        title: 'Cola de verificaciones',
        count: '{count, plural, =0 {Sin pendientes} one {# pendiente} other {# pendientes}}',
        empty: 'No hay solicitudes pendientes.',
        open: 'Revisar',
        openAria: 'Revisar la solicitud de {name}',
      },
    },
  },
};

function build(overrides: Partial<AdminVerificationRequest> = {}): AdminVerificationRequest {
  return {
    id: overrides.id ?? 'ver-test',
    status: overrides.status ?? 'pending',
    submittedAt: overrides.submittedAt ?? new Date('2026-05-27T08:00:00+02:00'),
    providerName: overrides.providerName ?? 'Estudi Test',
    providerType: overrides.providerType ?? 'autonomo',
    providerCity: overrides.providerCity ?? 'Barcelona',
    providerCategory: overrides.providerCategory ?? 'Peluquería',
    contactEmail: overrides.contactEmail ?? 'test@example.com',
    contactPhone: overrides.contactPhone ?? '+34 600 000 000',
    vatNumber: overrides.vatNumber ?? 'B-00000000',
    description: overrides.description ?? 'Descripción de prueba.',
    documents: overrides.documents ?? [],
  };
}

function renderWithIntl(ui: React.ReactNode) {
  return render(
    <NextIntlClientProvider locale="es" messages={messages} timeZone="Europe/Madrid">
      {ui}
    </NextIntlClientProvider>,
  );
}

describe('VerificationsQueue', () => {
  it('renderiza una fila por cada solicitud pendiente', () => {
    const requests = [
      build({ id: 'ver-a', providerName: 'Centro Uno', providerType: 'centro' }),
      build({ id: 'ver-b', providerName: 'Autónoma Dos', providerType: 'autonomo' }),
      build({ id: 'ver-c', providerName: 'Centro Tres', providerType: 'centro' }),
    ];

    renderWithIntl(<VerificationsQueue requests={requests} />);

    expect(screen.getByText('Centro Uno')).toBeInTheDocument();
    expect(screen.getByText('Autónoma Dos')).toBeInTheDocument();
    expect(screen.getByText('Centro Tres')).toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(3);
  });

  it('muestra el mensaje empty cuando no hay solicitudes', () => {
    renderWithIntl(<VerificationsQueue requests={[]} />);

    expect(screen.getByText('No hay solicitudes pendientes.')).toBeInTheDocument();
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
  });

  it('expone un enlace a la ficha de detalle por cada solicitud', () => {
    const requests = [build({ id: 'ver-link', providerName: 'Centro Enlace' })];

    renderWithIntl(<VerificationsQueue requests={requests} />);

    const link = screen.getByRole('link', { name: 'Revisar la solicitud de Centro Enlace' });
    // Con `localePrefix: 'always'`, next-intl prefija todas las rutas con
    // el locale activo en el test (es), de modo que el href construido
    // por <Link> incluye `/es/...`.
    expect(link).toHaveAttribute('href', '/es/admin/verificaciones/ver-link');
  });

  it('muestra el tipo correcto en el pill (centro / autonomo)', () => {
    const requests = [
      build({ id: 'ver-centro', providerType: 'centro' }),
      build({ id: 'ver-auto', providerType: 'autonomo' }),
    ];

    renderWithIntl(<VerificationsQueue requests={requests} />);

    expect(screen.getByText('Centro')).toBeInTheDocument();
    expect(screen.getByText('Autónomo')).toBeInTheDocument();
  });
});
