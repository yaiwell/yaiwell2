import { fireEvent, render, screen, within } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { fakePanelBookings } from '@/lib/fake-data/panel-bookings';
import { toPreviewBookingActions } from '@/lib/services/provider-panel/panel-calendar.service';
import messages from '@/messages/es.json';

import type { PanelBookingAction } from '../BookingActionsList/BookingActionsList.types';
import { WeeklyCalendar } from './WeeklyCalendar';
import { buildCalendarWeek } from './WeeklyCalendar.logic';

// Los enlaces de semana usan el Link de next-intl, que necesita el router.
vi.mock('@/i18n/navigation', () => ({
  Link: ({ href, children, ...rest }: { href: unknown; children: ReactNode }) => (
    <a href={JSON.stringify(href)} {...rest}>
      {children}
    </a>
  ),
}));

// Las acciones de los botones son server actions; aquí solo pintamos.
vi.mock('@/app/[locale]/panel/calendario/actions', () => ({
  cancelBookingAction: vi.fn(),
  completeBookingAction: vi.fn(),
}));
vi.mock('@/app/[locale]/panel/calendario/slot-offers.actions', () => ({
  releaseCancelledSlotAction: vi.fn(),
  releaseFreeSlotAction: vi.fn(),
  withdrawSlotOfferAction: vi.fn(),
}));

vi.mock('server-only', () => ({}));
vi.mock('@/lib/db/prisma', () => ({ prisma: {} }));

/** Martes 27 de octubre de 2026, 10:00 en Madrid. */
const NOW = new Date('2026-10-27T09:00:00.000Z');

// El detalle decide si se puede cancelar con el reloj real (regla de 2 h):
// lo fijamos en NOW para que el test no caduque cuando pasen las fechas.
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(NOW);
});

afterEach(() => {
  vi.useRealTimers();
});

function confirmedBooking(overrides: Partial<PanelBookingAction> = {}): PanelBookingAction {
  return {
    id: 'bk-1',
    startAtIso: '2026-10-29T15:00:00.000Z',
    weekday: 3,
    startTime: '16:00',
    endTime: '17:00',
    clientName: 'Marta R.',
    serviceName: 'Corte mujer',
    professionalName: 'Marina',
    status: 'confirmed',
    priceCents: 4500,
    ...overrides,
  };
}

function renderCalendar(bookings: PanelBookingAction[], readOnly = false) {
  return render(
    <NextIntlClientProvider locale="es" messages={messages}>
      <WeeklyCalendar
        bookings={bookings}
        week={buildCalendarWeek('2026-10-26', NOW, 'es-ES')}
        locale="es"
        readOnly={readOnly}
        now={NOW}
      />
    </NextIntlClientProvider>,
  );
}

describe('WeeklyCalendar', () => {
  it('pinta una columna por día con su fecha y marca hoy', () => {
    const { container } = renderCalendar([]);

    const headers = container.querySelectorAll('[data-component^="weekly-calendar-header-"]');
    expect(headers).toHaveLength(7);
    expect(headers[0]).toHaveTextContent('26');
    expect(headers[1]).toHaveAttribute('aria-current', 'date');
  });

  it('pinta un bloque por reserva en la cuadrícula', () => {
    const bookings = toPreviewBookingActions(fakePanelBookings);
    const { container } = renderCalendar(bookings, true);

    const blocks = container.querySelectorAll(
      '[data-component^="weekly-calendar-booking-"]:not([data-component$="-day"])',
    );
    expect(blocks).toHaveLength(bookings.length);
  });

  it('enlaza las semanas anterior y siguiente por su lunes', () => {
    renderCalendar([]);

    expect(screen.getByLabelText('Semana anterior')).toHaveAttribute(
      'href',
      expect.stringContaining('2026-10-19'),
    );
    expect(screen.getByLabelText('Semana siguiente')).toHaveAttribute(
      'href',
      expect.stringContaining('2026-11-02'),
    );
    // En la semana actual no hace falta «Hoy».
    expect(screen.queryByText('Hoy')).not.toBeInTheDocument();
  });

  it('oculta la navegación en modo preview', () => {
    renderCalendar([], true);

    expect(screen.queryByLabelText('Semana anterior')).not.toBeInTheDocument();
  });

  it('abre el detalle con las acciones al tocar un bloque', () => {
    const { container } = renderCalendar([confirmedBooking()]);

    const block = container.querySelector('[data-component="weekly-calendar-booking-bk-1"]');
    fireEvent.click(block as Element);

    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText('Marta R.')).toBeInTheDocument();
    expect(within(dialog).getByText('Marcar finalizada')).toBeInTheDocument();
    expect(within(dialog).getByText('Cancelar reserva')).toBeEnabled();
  });

  it('no ofrece acciones en una reserva ya completada', () => {
    const { container } = renderCalendar([confirmedBooking({ status: 'completed' })]);

    fireEvent.click(
      container.querySelector('[data-component="weekly-calendar-booking-bk-1"]') as Element,
    );

    const dialog = screen.getByRole('dialog');
    expect(within(dialog).queryByText('Marcar finalizada')).not.toBeInTheDocument();
    expect(
      within(dialog).getByText('Esta reserva ya está cerrada: no hay acciones pendientes.'),
    ).toBeInTheDocument();
  });

  it('bloquea cancelar en el detalle a menos de 2 h del inicio', () => {
    // NOW + 1 h 59 min.
    const { container } = renderCalendar([
      confirmedBooking({
        startAtIso: '2026-10-27T10:59:00.000Z',
        weekday: 1,
        startTime: '11:59',
        endTime: '12:59',
      }),
    ]);
    fireEvent.click(
      container.querySelector('[data-component="weekly-calendar-booking-bk-1"]') as Element,
    );

    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText('Cancelar reserva').closest('button')).toBeDisabled();
    expect(
      dialog.querySelector('[data-component="booking-actions-cancel-hint-bk-1"]'),
    ).toBeInTheDocument();
  });

  it('no ofrece finalizar una reserva pendiente de pago', () => {
    const { container } = renderCalendar([confirmedBooking({ status: 'pending' })]);
    fireEvent.click(
      container.querySelector('[data-component="weekly-calendar-booking-bk-1"]') as Element,
    );

    const dialog = screen.getByRole('dialog');
    expect(within(dialog).queryByText('Marcar finalizada')).not.toBeInTheDocument();
    expect(within(dialog).getByText('Cancelar reserva')).toBeInTheDocument();
  });

  it('deshabilita las acciones del detalle en modo preview', () => {
    const { container } = renderCalendar([confirmedBooking()], true);
    fireEvent.click(
      container.querySelector('[data-component="weekly-calendar-booking-bk-1"]') as Element,
    );

    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText('Marcar finalizada').closest('button')).toBeDisabled();
    expect(within(dialog).getByText('Cancelar reserva').closest('button')).toBeDisabled();
  });

  it('en móvil abre por hoy y cambia de día con las pestañas', () => {
    const { container } = renderCalendar([confirmedBooking()]);
    const dayView = container.querySelector('[data-component="weekly-calendar-day-view"]');
    const view = within(dayView as HTMLElement);

    expect(view.getByRole('tab', { selected: true })).toHaveAttribute(
      'data-component',
      'weekly-calendar-day-tab-tue',
    );
    expect(view.getByText('Sin reservas')).toBeInTheDocument();

    fireEvent.click(
      container.querySelector('[data-component="weekly-calendar-day-tab-thu"]') as Element,
    );
    expect(
      container.querySelector('[data-component="weekly-calendar-booking-bk-1-day"]'),
    ).toBeInTheDocument();
  });

  it('amplía las horas visibles si una reserva empieza antes de las 8', () => {
    renderCalendar([confirmedBooking({ startTime: '07:00', endTime: '07:45' })]);

    expect(screen.getAllByText('07:00').length).toBeGreaterThan(0);
  });
});
