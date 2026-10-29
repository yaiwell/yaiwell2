import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NextIntlClientProvider } from 'next-intl';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import messages from '@/messages/es.json';

import { BookingActionsList } from '../BookingActionsList';
import type { PanelBookingAction } from '../BookingActionsList';
import { ReleaseCancelledSlotButton, ReleaseSlotPromptProvider } from './index';
import type { ReleaseSlotRequest } from './ReleaseSlotDialog.types';

/**
 * «Liberar con descuento» sobre una reserva ya cancelada (§4.bis, caso a),
 * la cancelara el centro o el cliente: botón del listado y enlace directo
 * del email (`?liberar=`), que abren el mismo diálogo que tras cancelar.
 */

const releaseCancelledSlotActionMock = vi.hoisted(() => vi.fn());
vi.mock('@/app/[locale]/panel/calendario/slot-offers.actions', () => ({
  releaseCancelledSlotAction: releaseCancelledSlotActionMock,
  releaseFreeSlotAction: vi.fn(),
  withdrawSlotOfferAction: vi.fn(),
}));
vi.mock('@/app/[locale]/panel/calendario/actions', () => ({
  cancelBookingAction: vi.fn(),
  completeBookingAction: vi.fn(),
}));

const START_IN_3H = () => new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString();
const DIALOG_TITLE = messages.providerPanel.calendar.slotOffers.releaseTitle;
const RELEASE = messages.providerPanel.calendar.slotOffers.free.release;

function cancelledBooking(overrides: Partial<PanelBookingAction> = {}): PanelBookingAction {
  return {
    id: 'bk-1',
    startAtIso: START_IN_3H(),
    weekday: 0,
    startTime: '09:00',
    endTime: '10:00',
    clientName: 'Marta R.',
    serviceName: 'Corte mujer',
    professionalName: 'Marina',
    status: 'cancelled',
    priceCents: 4500,
    releasable: true,
    ...overrides,
  };
}

function renderWithProvider(ui: ReactNode, initialRequest: ReleaseSlotRequest | null = null) {
  return render(
    <NextIntlClientProvider locale="es" messages={messages}>
      <ReleaseSlotPromptProvider locale="es" initialRequest={initialRequest}>
        {ui}
      </ReleaseSlotPromptProvider>
    </NextIntlClientProvider>,
  );
}

beforeEach(() => {
  releaseCancelledSlotActionMock.mockReset();
});

describe('Liberar con descuento una reserva cancelada', () => {
  it('el listado ofrece el botón en una cancelada liberable y abre el diálogo de 3 tramos', async () => {
    const user = userEvent.setup();
    renderWithProvider(
      <BookingActionsList bookings={[cancelledBooking()]} locale="es" readOnly={false} />,
    );

    await user.click(screen.getByRole('button', { name: RELEASE }));

    expect(await screen.findByText(DIALOG_TITLE)).toBeInTheDocument();
    expect(screen.getByText('10 %')).toBeInTheDocument();
    expect(screen.getByText('30 %')).toBeInTheDocument();
  });

  it('no lo ofrece si el servidor dice que no es liberable', () => {
    renderWithProvider(
      <BookingActionsList
        bookings={[cancelledBooking({ releasable: false })]}
        locale="es"
        readOnly={false}
      />,
    );

    expect(screen.queryByRole('button', { name: RELEASE })).not.toBeInTheDocument();
  });

  it('envía la liberación con el id de la reserva cancelada', async () => {
    releaseCancelledSlotActionMock.mockResolvedValue({ ok: true });
    const user = userEvent.setup();
    renderWithProvider(<ReleaseCancelledSlotButton bookingId="bk-1" startAtIso={START_IN_3H()} />);

    await user.click(screen.getByRole('button', { name: RELEASE }));
    await user.click(
      await screen.findByRole('button', {
        name: messages.providerPanel.calendar.slotOffers.submit,
      }),
    );

    expect(releaseCancelledSlotActionMock).toHaveBeenCalledWith(
      'es',
      expect.objectContaining({ bookingId: 'bk-1' }),
    );
  });

  it('el enlace del email abre el diálogo al cargar', async () => {
    renderWithProvider(<p>calendario</p>, {
      target: { kind: 'cancelled', bookingId: 'bk-1', startAtIso: START_IN_3H() },
    });

    expect(await screen.findByText(DIALOG_TITLE)).toBeInTheDocument();
  });
});
