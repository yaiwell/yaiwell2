import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NextIntlClientProvider } from 'next-intl';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import messages from '@/messages/es.json';

/**
 * Tests de «No se presentó» y «Deshacer» en el listado del panel
 * (§4.bis): cuándo se ofrecen (mismas ventanas que el dominio), qué
 * cuenta el diálogo según el modo de pago y la etiqueta «Pago en el local».
 */

const markNoShowActionMock = vi.fn();
const undoNoShowActionMock = vi.fn();
vi.mock('@/app/[locale]/panel/calendario/actions', () => ({
  completeBookingAction: vi.fn(),
  cancelBookingAction: vi.fn(),
  markNoShowAction: (...args: unknown[]) => markNoShowActionMock(...args),
  undoNoShowAction: (...args: unknown[]) => undoNoShowActionMock(...args),
}));
vi.mock('@/app/[locale]/panel/calendario/slot-offers.actions', () => ({
  releaseCancelledSlotAction: vi.fn(),
  releaseFreeSlotAction: vi.fn(),
  withdrawSlotOfferAction: vi.fn(),
}));

import { BookingActionsList } from './BookingActionsList';
import { buildBookingActionRows } from './BookingActionsList.logic';
import type { PanelBookingAction } from './BookingActionsList.types';
import { markNoShowErrorKey, undoNoShowErrorKey } from './BookingNoShow.logic';

const NOW = new Date('2026-11-10T12:00:00.000Z');
const HOUR = 60 * 60 * 1000;

function booking(overrides: Partial<PanelBookingAction> = {}): PanelBookingAction {
  return {
    id: 'bk-1',
    startAtIso: new Date(NOW.getTime() - HOUR).toISOString(),
    weekday: 1,
    startTime: '12:00',
    endTime: '13:00',
    clientName: 'Ana',
    serviceName: 'Corte',
    professionalName: null,
    status: 'confirmed',
    priceCents: 3000,
    paymentMode: 'onsite',
    noShowAtIso: null,
    ...overrides,
  };
}

function renderList(bookings: PanelBookingAction[]) {
  render(
    <NextIntlClientProvider locale="es" messages={messages} timeZone="Europe/Madrid">
      <BookingActionsList bookings={bookings} locale="es" readOnly={false} now={NOW} />
    </NextIntlClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('buildBookingActionRows · no presentado', () => {
  it('se puede marcar desde el inicio hasta 72 h después, no antes', () => {
    const [started, future, stale] = buildBookingActionRows(
      [
        booking(),
        booking({ id: 'f', startAtIso: new Date(NOW.getTime() + HOUR).toISOString() }),
        booking({ id: 's', startAtIso: new Date(NOW.getTime() - 73 * HOUR).toISOString() }),
      ],
      NOW,
    );
    expect(started.canMarkNoShow).toBe(true);
    expect(future.canMarkNoShow).toBe(false);
    expect(stale.canMarkNoShow).toBe(false);
  });

  it('«Deshacer» solo durante 24 h desde que se marcó', () => {
    const [recent, old] = buildBookingActionRows(
      [
        booking({
          status: 'no_show',
          noShowAtIso: new Date(NOW.getTime() - 23 * HOUR).toISOString(),
        }),
        booking({
          id: 'o',
          status: 'no_show',
          noShowAtIso: new Date(NOW.getTime() - 25 * HOUR).toISOString(),
        }),
      ],
      NOW,
    );
    expect(recent.canUndoNoShow).toBe(true);
    expect(old.canUndoNoShow).toBe(false);
  });

  it('en modo preview (sin instante real) no ofrece marcar', () => {
    const [row] = buildBookingActionRows([booking({ startAtIso: null })], NOW);
    expect(row.canMarkNoShow).toBe(false);
  });
});

describe('BookingActionsList · no presentado', () => {
  it('etiqueta «Pago en el local» y diálogo con la sanción', async () => {
    markNoShowActionMock.mockResolvedValue({ ok: true });
    renderList([booking()]);

    expect(screen.getByText('Pago en el local')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /No se presentó/ }));
    const dialog = screen.getByRole('alertdialog');
    expect(dialog).toHaveTextContent('1 sanción');

    await userEvent.click(within(dialog).getByRole('button', { name: 'Sí, no se presentó' }));
    expect(markNoShowActionMock).toHaveBeenCalledWith('es', 'bk-1');
  });

  it('online: el diálogo dice que no hay devolución ni sanción', async () => {
    renderList([booking({ paymentMode: 'online' })]);

    expect(screen.queryByText('Pago en el local')).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: /No se presentó/ }));
    expect(screen.getByRole('alertdialog')).toHaveTextContent('no se le devuelve el importe');
  });

  it('un error del servidor se cuenta dentro del diálogo', async () => {
    markNoShowActionMock.mockResolvedValue({ ok: false, code: 'WINDOW_CLOSED' });
    renderList([booking()]);

    await userEvent.click(screen.getByRole('button', { name: /No se presentó/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Sí, no se presentó' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('más de 72 h');
  });

  it('marcada hace poco: estado «No presentado» y «Deshacer»', async () => {
    undoNoShowActionMock.mockResolvedValue({ ok: true });
    renderList([
      booking({ status: 'no_show', noShowAtIso: new Date(NOW.getTime() - HOUR).toISOString() }),
    ]);

    expect(screen.getByText('No presentado')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /Deshacer/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Sí, deshacer' }));
    expect(undoNoShowActionMock).toHaveBeenCalledWith('es', 'bk-1');
  });
});

describe('BookingNoShow.logic', () => {
  it('traduce los códigos a claves de copy', () => {
    expect(markNoShowErrorKey('NOT_STARTED')).toBe('notStarted');
    expect(markNoShowErrorKey('SLOT_TAKEN')).toBe('internal');
    expect(undoNoShowErrorKey('UNDO_WINDOW_CLOSED')).toBe('windowClosed');
    expect(undoNoShowErrorKey('SLOT_TAKEN')).toBe('slotTaken');
  });
});
