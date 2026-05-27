import { render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { describe, expect, it } from 'vitest';

import { fakePanelWeeklyMetrics } from '@/lib/fake-data/panel-metrics';

import { DashboardMetrics } from './DashboardMetrics';

/**
 * Mensajes mínimos del namespace `providerPanel.dashboard` para que el
 * Provider de next-intl no se queje en el render aislado.
 */
const messages = {
  providerPanel: {
    dashboard: {
      title: 'Resumen semanal',
      subtitle: 'Cómo va tu semana.',
      metrics: {
        weekRevenue: 'Ingresos semana',
        weekBookings: 'Reservas semana',
        averageTicket: 'Ticket medio',
        occupancy: 'Ocupación',
        vsLastWeek: 'vs. semana anterior',
      },
      chart: {
        title: 'Ingresos por día',
        subtitle: 'Comparativa.',
        dayShort: {
          mon: 'Lun',
          tue: 'Mar',
          wed: 'Mié',
          thu: 'Jue',
          fri: 'Vie',
          sat: 'Sáb',
          sun: 'Dom',
        },
        barAriaLabel: '{day}: {revenue}, {count, plural, one {# reserva} other {# reservas}}',
      },
      topServices: {
        title: 'Servicios más reservados',
        subtitle: 'Top 4.',
        bookings: '{count, plural, one {# reserva} other {# reservas}}',
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

describe('DashboardMetrics', () => {
  it('renderiza los 4 KPIs principales con sus etiquetas', () => {
    renderWithIntl(<DashboardMetrics metrics={fakePanelWeeklyMetrics} locale="es" />);

    expect(screen.getByText('Ingresos semana')).toBeInTheDocument();
    expect(screen.getByText('Reservas semana')).toBeInTheDocument();
    expect(screen.getByText('Ticket medio')).toBeInTheDocument();
    expect(screen.getByText('Ocupación')).toBeInTheDocument();
  });

  it('renderiza una barra por cada día de la serie semanal', () => {
    const { container } = renderWithIntl(
      <DashboardMetrics metrics={fakePanelWeeklyMetrics} locale="es" />,
    );

    const bars = container.querySelectorAll('[data-component^="dashboard-chart-bar-"]');

    expect(bars.length).toBe(fakePanelWeeklyMetrics.dailyRevenue.length);
  });

  it('renderiza el listado de top servicios con su nombre traducido', () => {
    renderWithIntl(<DashboardMetrics metrics={fakePanelWeeklyMetrics} locale="es" />);

    // Comprobamos que aparece al menos uno de los servicios del mock.
    expect(screen.getByText('Corte mujer')).toBeInTheDocument();
  });
});
