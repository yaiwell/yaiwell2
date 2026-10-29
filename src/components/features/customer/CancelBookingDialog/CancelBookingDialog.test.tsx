import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NextIntlClientProvider } from 'next-intl';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import messages from '@/messages/es.json';

import { ReviewFeedbackProvider } from '../ReviewFeedback';
import { CancelBookingDialog } from './CancelBookingDialog';

/**
 * Tests del diálogo con el que el cliente cancela una reserva.
 *
 * La server action se mockea: aquí se prueba la UI (qué cuenta del
 * dinero antes de confirmar, estado de carga, resultado, errores
 * traducidos y que la ventana de 2 h se vigila en el cliente). El
 * contrato de la action tiene su propio test.
 */

const cancelMyBookingAction = vi.hoisted(() => vi.fn());
vi.mock('@/app/[locale]/mis-reservas/cancel-actions', () => ({ cancelMyBookingAction }));

const BOOKING_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const START = new Date('2026-10-05T16:00:00.000Z');
const HOUR = 60 * 60_000;
const a = messages.customerArea.actions;
const d = messages.customerArea.cancelDialog;

function renderDialog(
  props: { refundable?: boolean; enforceWindow?: boolean } = {},
  wrap?: (ui: ReactNode) => ReactNode,
) {
  const ui = (
    <CancelBookingDialog
      bookingId={BOOKING_ID}
      serviceName="Masaje relax"
      providerName="Casa Mar"
      startAtIso={START.toISOString()}
      whenLabel="lun, 5 oct, 18:00"
      amountLabel="45,00 €"
      refundable={props.refundable ?? true}
      enforceWindow={props.enforceWindow ?? true}
    />
  );
  return render(
    <NextIntlClientProvider locale="es" messages={messages} timeZone="Europe/Madrid">
      {wrap ? wrap(ui) : ui}
    </NextIntlClientProvider>,
  );
}

async function openDialog() {
  const user = userEvent.setup();
  await user.click(screen.getByRole('button', { name: a.cancel }));
  return user;
}

beforeEach(() => {
  cancelMyBookingAction.mockReset();
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(START.getTime() - 24 * HOUR));
});

afterEach(() => {
  vi.useRealTimers();
});

describe('CancelBookingDialog', () => {
  it('antes de confirmar cuenta el importe que se devuelve y el plazo', async () => {
    renderDialog();
    await openDialog();

    expect(screen.getByRole('alertdialog', { name: d.title })).toBeInTheDocument();
    expect(screen.getByText(/importe íntegro \(45,00 €\).*5 a 10 días/)).toBeInTheDocument();
  });

  it('sin cobro dice que no hay nada que devolver', async () => {
    renderDialog({ refundable: false });
    await openDialog();

    expect(screen.getByText(d.noPaymentInfo)).toBeInTheDocument();
  });

  it('confirma con estado de carga y muestra el resultado', async () => {
    let resolve: (value: unknown) => void = () => undefined;
    cancelMyBookingAction.mockReturnValue(new Promise((r) => (resolve = r)));
    renderDialog();
    const user = await openDialog();

    await user.click(screen.getByRole('button', { name: d.confirm }));

    expect(cancelMyBookingAction).toHaveBeenCalledWith('es', { bookingId: BOOKING_ID });
    const pending = await screen.findByRole('button', { name: d.pending });
    expect(pending).toBeDisabled();

    resolve({ ok: true, refund: 'refunded' });

    expect(
      await screen.findByText(/Reserva cancelada\. Te devolvemos 45,00 €/),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: d.confirm })).not.toBeInTheDocument();
  });

  it('con el aviso de página, anuncia el resultado allí y cierra el diálogo', async () => {
    cancelMyBookingAction.mockResolvedValue({ ok: true, refund: 'refund_pending' });
    renderDialog({}, (ui) => <ReviewFeedbackProvider>{ui}</ReviewFeedbackProvider>);
    const user = await openDialog();

    await user.click(screen.getByRole('button', { name: d.confirm }));

    expect(
      await screen.findByText(
        'Reserva cancelada. Estamos tramitando la devolución de 45,00 € y te escribiremos por email.',
      ),
    ).toBeInTheDocument();
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });

  it.each(['TOO_LATE', 'LAST_MINUTE', 'FORBIDDEN', 'INTERNAL'] as const)(
    'traduce el error %s y deja el diálogo abierto',
    async (code) => {
      cancelMyBookingAction.mockResolvedValue({ ok: false, code });
      renderDialog();
      const user = await openDialog();

      await user.click(screen.getByRole('button', { name: d.confirm }));

      expect(await screen.findByRole('alert')).toHaveTextContent(d.errors[code]);
      expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    },
  );

  it('si ya faltan menos de 2 h, no ofrece el botón y explica por qué', () => {
    vi.setSystemTime(new Date(START.getTime() - 2 * HOUR + 60_000));
    renderDialog();

    expect(screen.queryByRole('button', { name: a.cancel })).not.toBeInTheDocument();
    expect(screen.getByText(a.tooLateHint)).toBeInTheDocument();
  });

  it('una pending sin cobro sigue ofreciendo cancelar a menos de 2 h', () => {
    vi.setSystemTime(new Date(START.getTime() - 45 * 60_000));
    renderDialog({ refundable: false, enforceWindow: false });

    expect(screen.getByRole('button', { name: a.cancel })).toBeInTheDocument();
  });
});
