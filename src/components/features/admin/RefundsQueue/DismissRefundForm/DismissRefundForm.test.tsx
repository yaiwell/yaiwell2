import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NextIntlClientProvider } from 'next-intl';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import es from '@/messages/es.json';

import { RetryFeedbackRegion } from '../RetryFeedbackRegion';
import { DismissRefundForm } from './DismissRefundForm';

/**
 * Tests del descarte desde la fila de la cola.
 *
 * Se protege que el motivo corto no llegue a la action, que el motivo
 * válido viaje con locale y reserva, y que el desenlace acabe en la
 * región `role="status"` compartida con el reintento.
 */

const { dismissRefundActionMock } = vi.hoisted(() => ({ dismissRefundActionMock: vi.fn() }));

vi.mock('@/app/[locale]/admin/reembolsos/actions', () => ({
  dismissRefundAction: dismissRefundActionMock,
}));

const messages = { adminArea: { refunds: es.adminArea.refunds } };

function renderForm() {
  return render(
    <NextIntlClientProvider locale="es" messages={messages}>
      <RetryFeedbackRegion>
        <DismissRefundForm bookingId="booking-1" providerName="Estudi Test" locale="es" />
      </RetryFeedbackRegion>
    </NextIntlClientProvider>,
  );
}

async function openAndType(reason: string) {
  const user = userEvent.setup();
  await user.click(
    screen.getByRole('button', { name: 'Descartar el reembolso de Estudi Test de la cola' }),
  );
  if (reason) await user.type(screen.getByLabelText('Motivo del descarte'), reason);
  await user.click(screen.getByRole('button', { name: 'Confirmar descarte' }));
}

describe('DismissRefundForm', () => {
  beforeEach(() => {
    dismissRefundActionMock.mockReset();
  });

  it('no llama a la action con un motivo demasiado corto', async () => {
    renderForm();

    await openAndType('ok');

    expect(await screen.findByRole('alert')).toHaveTextContent('al menos 5 caracteres');
    expect(dismissRefundActionMock).not.toHaveBeenCalled();
  });

  it('descarta con el motivo y avisa en la región de estado', async () => {
    dismissRefundActionMock.mockResolvedValue({ ok: true });
    renderForm();

    await openAndType('Nunca hubo cobro en Stripe');

    expect(dismissRefundActionMock).toHaveBeenCalledWith(
      'es',
      'booking-1',
      'Nunca hubo cobro en Stripe',
    );
    expect(await screen.findByRole('status')).toHaveTextContent(
      'Entrada de Estudi Test descartada',
    );
  });

  it('muestra el error tipado de la action', async () => {
    dismissRefundActionMock.mockResolvedValue({ ok: false, code: 'NOT_DISMISSABLE' });
    renderForm();

    await openAndType('Nunca hubo cobro en Stripe');

    expect(await screen.findByRole('status')).toHaveTextContent(
      'La reserva de Estudi Test no está cancelada',
    );
  });
});
