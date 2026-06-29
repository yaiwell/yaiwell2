import { render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { describe, expect, it, vi } from 'vitest';

import { fakePanelServices } from '@/lib/fake-data/panel-services';

// Stub de las server actions — los hijos cliente (toggle / delete) importan
// el módulo de `actions` que arrastra `server-only` y romperían el render.
vi.mock('@/app/[locale]/panel/servicios/actions', () => ({
  toggleServiceActiveAction: vi.fn(async () => ({ ok: true as const })),
  deleteServiceAction: vi.fn(async () => ({ ok: true as const })),
}));

import { ServicesList } from './ServicesList';

const messages = {
  providerPanel: {
    services: {
      title: 'Servicios ofrecidos',
      subtitle: 'Gestiona tu carta.',
      addCta: 'Añadir servicio',
      status: { active: 'Activo', paused: 'Pausado' },
      duration: '{minutes} min',
      bookings30d: '{count} reservas / 30d',
      edit: 'Editar',
      pause: 'Pausar',
      resume: 'Reactivar',
      updating: 'Actualizando…',
      empty: 'Sin servicios.',
      delete: {
        button: 'Eliminar',
        confirmTitle: '¿Eliminar servicio?',
        confirmDescription: 'Esta acción no se puede deshacer.',
        confirmAction: 'Eliminar',
        cancel: 'Cancelar',
        deleting: 'Eliminando…',
        errors: {
          notFound: 'Este servicio ya no existe.',
          forbidden: 'No tienes permiso para eliminar este servicio.',
          internal: 'No se ha podido eliminar.',
        },
      },
    },
  },
};

function renderWithIntl(ui: React.ReactNode) {
  return render(
    <NextIntlClientProvider locale="es" messages={messages}>
      {ui}
    </NextIntlClientProvider>,
  );
}

describe('ServicesList', () => {
  it('renderiza una entrada por cada servicio del proveedor', () => {
    const { container } = renderWithIntl(<ServicesList services={fakePanelServices} locale="es" />);

    const items = container.querySelectorAll('[data-component^="services-list-item-"]');

    expect(items.length).toBe(fakePanelServices.length);
  });

  it('muestra el badge "Pausado" en servicios inactivos y "Activo" en los demás', () => {
    renderWithIntl(<ServicesList services={fakePanelServices} locale="es" />);

    const pausedCount = fakePanelServices.filter((svc) => svc.status === 'paused').length;
    const activeCount = fakePanelServices.length - pausedCount;

    expect(screen.getAllByText('Pausado')).toHaveLength(pausedCount);
    expect(screen.getAllByText('Activo')).toHaveLength(activeCount);
  });

  it('muestra el estado vacío cuando no hay servicios', () => {
    renderWithIntl(<ServicesList services={[]} locale="es" />);

    expect(screen.getByText('Sin servicios.')).toBeInTheDocument();
  });

  it('expone un CTA "Añadir servicio" que enlaza a la pantalla de alta', () => {
    renderWithIntl(<ServicesList services={fakePanelServices} locale="es" />);

    const cta = screen.getByRole('link', { name: /Añadir servicio/i });

    expect(cta).toHaveAttribute('href', expect.stringContaining('/panel/servicios/nuevo'));
  });

  it('pinta un botón "Eliminar" por servicio (trigger del diálogo de confirmación)', () => {
    const { container } = renderWithIntl(<ServicesList services={fakePanelServices} locale="es" />);

    const deleteTriggers = container.querySelectorAll('[data-component^="services-list-delete-"]');

    expect(deleteTriggers.length).toBe(fakePanelServices.length);
  });
});
