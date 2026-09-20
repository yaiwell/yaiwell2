import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NextIntlClientProvider } from 'next-intl';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock de las server actions: el módulo real importa Prisma y Clerk,
// que romperían el render en happy-dom.
const completeBookingActionMock = vi.fn();
const cancelBookingActionMock = vi.fn();
vi.mock('@/app/[locale]/panel/calendario/actions', () => ({
  completeBookingAction: (...args: unknown[]) => completeBookingActionMock(...args),
  cancelBookingAction: (...args: unknown[]) => cancelBookingActionMock(...args),
}));

import { BookingActionsList } from './BookingActionsList';
import type { PanelBookingAction } from './BookingActionsList.types';

/**
 * Mensajes inline: los ficheros de `src/messages` los mantiene el
 * orquestador, así que el test declara su propio árbol con las claves
 * que consume el componente (mismo patrón que `ServiceDeleteButton`).
 */
const messages = {
  providerPanel: {
    calendar: {
      weekdays: {
        mon: 'Lunes',
        tue: 'Martes',
        wed: 'Miércoles',
        thu: 'Jueves',
        fri: 'Viernes',
        sat: 'Sábado',
        sun: 'Domingo',
      },
      status: {
        pending: 'Pendiente',
        confirmed: 'Confirmada',
        completed: 'Completada',
        cancelled: 'Cancelada',
        refunded: 'Reembolsada',
      },
      actions: {
        title: 'Reservas de esta semana',
        subtitle: 'Marca como finalizada cada cita atendida.',
        empty: 'No tienes reservas esta semana.',
        readOnlyHint: 'Estás viendo datos de ejemplo: las acciones están desactivadas.',
        clientWithProfessional: '{client} · con {professional}',
        complete: {
          button: 'Marcar finalizada',
          confirmTitle: '¿Marcar la reserva como finalizada?',
          confirmDescription: 'El cliente podrá valorarte. No se puede deshacer.',
          confirmAction: 'Sí, marcar como finalizada',
          cancel: 'Volver',
          pending: 'Guardando…',
          errors: {
            notFound: 'Esta reserva ya no existe.',
            forbidden: 'No tienes permiso sobre esta reserva.',
            notConfirmed: 'Solo puedes finalizar reservas confirmadas.',
            internal: 'No se ha podido completar.',
          },
        },
        cancel: {
          button: 'Cancelar reserva',
          confirmTitle: '¿Cancelar esta reserva?',
          confirmDescription: 'Devolvemos el importe íntegro al cliente.',
          confirmAction: 'Sí, cancelar y reembolsar',
          keep: 'Mantener reserva',
          pending: 'Cancelando…',
          blockedHint:
            'Faltan menos de 2 horas: la excepción por fuerza mayor la gestiona soporte.',
          errors: {
            notFound: 'Esta reserva ya no existe.',
            forbidden: 'No tienes permiso sobre esta reserva.',
            tooLate: 'Ya faltan menos de 2 horas.',
            notCancellable: 'Esta reserva ya no se puede cancelar.',
            refundFailed:
              'La reserva se ha cancelado, pero el reembolso no ha podido emitirse. Soporte lo revisará; no hace falta que lo intentes de nuevo.',
            internal: 'No se ha podido cancelar.',
          },
        },
      },
    },
  },
};

/** Devuelve un ISO desplazado `minutes` minutos respecto a ahora. */
function isoInMinutes(minutes: number): string {
  return new Date(Date.now() + minutes * 60_000).toISOString();
}

function makeBooking(overrides: Partial<PanelBookingAction> = {}): PanelBookingAction {
  return {
    id: 'bk-1',
    startAtIso: isoInMinutes(24 * 60),
    weekday: 0,
    startTime: '09:00',
    endTime: '10:00',
    clientName: 'Marta R.',
    serviceName: 'Corte mujer',
    professionalName: 'Marina',
    status: 'confirmed',
    priceCents: 4500,
    ...overrides,
  };
}

function renderList(bookings: PanelBookingAction[], readOnly = false) {
  return render(
    <NextIntlClientProvider locale="es" messages={messages}>
      <BookingActionsList bookings={bookings} locale="es" readOnly={readOnly} />
    </NextIntlClientProvider>,
  );
}

describe('BookingActionsList', () => {
  beforeEach(() => {
    completeBookingActionMock.mockReset();
    cancelBookingActionMock.mockReset();
  });

  it('muestra el vacío cuando no hay reservas en la semana', () => {
    renderList([]);

    expect(screen.getByText('No tienes reservas esta semana.')).toBeInTheDocument();
  });

  it('bloquea el botón de cancelar a 1 h 59 min del inicio y explica por qué', () => {
    renderList([makeBooking({ startAtIso: isoInMinutes(119) })]);

    expect(screen.getByRole('button', { name: /Cancelar reserva/ })).toBeDisabled();
    expect(
      screen.getByText(/la excepción por fuerza mayor la gestiona soporte/i),
    ).toBeInTheDocument();
  });

  it('permite cancelar a 2 h 01 min del inicio', () => {
    renderList([makeBooking({ startAtIso: isoInMinutes(121) })]);

    expect(screen.getByRole('button', { name: /Cancelar reserva/ })).toBeEnabled();
    expect(
      screen.queryByText(/la excepción por fuerza mayor la gestiona soporte/i),
    ).not.toBeInTheDocument();
  });

  it('en modo preview muestra la lista pero con ambas acciones deshabilitadas', () => {
    renderList([makeBooking({ startAtIso: null })], true);

    expect(screen.getByText(/datos de ejemplo/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Marcar finalizada/ })).toBeDisabled();
    expect(screen.getByRole('button', { name: /Cancelar reserva/ })).toBeDisabled();
  });

  it('no ofrece "marcar finalizada" en una reserva pendiente de pago', () => {
    renderList([makeBooking({ status: 'pending' })]);

    expect(screen.queryByRole('button', { name: /Marcar finalizada/ })).not.toBeInTheDocument();
    // La cancelación sí sigue disponible en `pending`.
    expect(screen.getByRole('button', { name: /Cancelar reserva/ })).toBeEnabled();
  });

  it('muestra el estado "Reembolsada" y ya no ofrece acciones sobre ella', () => {
    renderList([makeBooking({ status: 'refunded' })]);

    expect(screen.getByText('Reembolsada')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Marcar finalizada/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Cancelar reserva/ })).not.toBeInTheDocument();
  });

  it('invoca completeBookingAction con (locale, bookingId) al confirmar', async () => {
    completeBookingActionMock.mockResolvedValueOnce({ ok: true });
    const user = userEvent.setup();
    renderList([makeBooking()]);

    await user.click(screen.getByRole('button', { name: /Marcar finalizada/ }));
    await user.click(screen.getByRole('button', { name: 'Sí, marcar como finalizada' }));

    expect(completeBookingActionMock).toHaveBeenCalledWith('es', 'bk-1');
  });

  it('mantiene el diálogo abierto y avisa cuando el reembolso falla', async () => {
    cancelBookingActionMock.mockResolvedValueOnce({ ok: false, code: 'REFUND_FAILED' });
    const user = userEvent.setup();
    renderList([makeBooking()]);

    await user.click(screen.getByRole('button', { name: /Cancelar reserva/ }));
    await user.click(screen.getByRole('button', { name: 'Sí, cancelar y reembolsar' }));

    expect(await screen.findByText(/el reembolso no ha podido emitirse/i)).toBeInTheDocument();
    // El diálogo sigue abierto: la cancelación se aplicó, pero el
    // proveedor debe leer qué ha pasado con el dinero.
    expect(screen.getByText('¿Cancelar esta reserva?')).toBeInTheDocument();
  });
});
