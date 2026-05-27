import { render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { describe, expect, it } from 'vitest';

import { fakePanelServices } from '@/lib/fake-data/panel-services';

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
      empty: 'Sin servicios.',
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
});
