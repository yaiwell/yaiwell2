import { render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { describe, expect, it } from 'vitest';

import { fakePanelBookings } from '@/lib/fake-data/panel-bookings';

import { WeeklyCalendar } from './WeeklyCalendar';

const messages = {
  providerPanel: {
    calendar: {
      title: 'Calendario semanal',
      subtitle: 'Tus reservas.',
      weekdays: {
        mon: 'Lunes',
        tue: 'Martes',
        wed: 'Miércoles',
        thu: 'Jueves',
        fri: 'Viernes',
        sat: 'Sábado',
        sun: 'Domingo',
      },
      weekdayShort: {
        mon: 'Lun',
        tue: 'Mar',
        wed: 'Mié',
        thu: 'Jue',
        fri: 'Vie',
        sat: 'Sáb',
        sun: 'Dom',
      },
      status: {
        confirmed: 'Confirmada',
        pending: 'Pendiente',
        completed: 'Completada',
        cancelled: 'Cancelada',
      },
      legend: 'Leyenda',
      emptyDay: 'Sin reservas',
      bookingAriaLabel: '{service} con {client} a las {time}',
      summary: '{count, plural, one {# reserva esta semana} other {# reservas esta semana}}',
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

describe('WeeklyCalendar', () => {
  it('renderiza una columna por cada día de la semana', () => {
    const { container } = renderWithIntl(<WeeklyCalendar bookings={fakePanelBookings} />);

    const dayColumns = container.querySelectorAll('[data-component^="weekly-calendar-day-"]');

    expect(dayColumns.length).toBe(7);
  });

  it('pinta una entrada por cada reserva recibida', () => {
    const { container } = renderWithIntl(<WeeklyCalendar bookings={fakePanelBookings} />);

    const blocks = container.querySelectorAll('[data-component^="weekly-calendar-booking-"]');

    expect(blocks.length).toBe(fakePanelBookings.length);
  });

  it('muestra el contador semanal de reservas pluralizado', () => {
    renderWithIntl(<WeeklyCalendar bookings={fakePanelBookings} />);

    expect(
      screen.getByText(`${fakePanelBookings.length} reservas esta semana`),
    ).toBeInTheDocument();
  });
});
