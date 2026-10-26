import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NextIntlClientProvider } from 'next-intl';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import es from '@/messages/es.json';

import { RetryFeedbackRegion } from '../RetryFeedbackRegion';
import { RetryRefundButton } from './RetryRefundButton';

/**
 * Tests del botón de reintento y de la región de aviso.
 *
 * Mockeamos la server action y comprobamos que cada desenlace
 * (reembolsado, sigue fallando, no aplicable, rechazo) acaba en el
 * mensaje correcto dentro de la región `role="status"`.
 */

const { retryRefundActionMock } = vi.hoisted(() => ({ retryRefundActionMock: vi.fn() }));

vi.mock('@/app/[locale]/admin/reembolsos/actions', () => ({
  retryRefundAction: retryRefundActionMock,
}));

const messages = { adminArea: { refunds: es.adminArea.refunds } };

function renderButton() {
  return render(
    <NextIntlClientProvider locale="es" messages={messages}>
      <RetryFeedbackRegion>
        <RetryRefundButton bookingId="booking-1" providerName="Estudi Test" locale="es" />
      </RetryFeedbackRegion>
    </NextIntlClientProvider>,
  );
}

async function clickRetry() {
  const user = userEvent.setup();
  await user.click(screen.getByRole('button', { name: 'Reintentar el reembolso de Estudi Test' }));
}

describe('RetryRefundButton', () => {
  beforeEach(() => {
    retryRefundActionMock.mockReset();
  });

  it('llama a la action con el locale y la reserva', async () => {
    retryRefundActionMock.mockResolvedValue({ ok: true, outcome: 'succeeded' });
    renderButton();

    await clickRetry();

    expect(retryRefundActionMock).toHaveBeenCalledWith('es', 'booking-1');
  });

  it('avisa del reembolso emitido', async () => {
    retryRefundActionMock.mockResolvedValue({ ok: true, outcome: 'succeeded' });
    renderButton();

    await clickRetry();

    expect(await screen.findByRole('status')).toHaveTextContent('Reembolso emitido (Estudi Test)');
  });

  it('avisa de que el reembolso sigue fallando', async () => {
    retryRefundActionMock.mockResolvedValue({ ok: true, outcome: 'failed' });
    renderButton();

    await clickRetry();

    expect(await screen.findByRole('status')).toHaveTextContent(
      'El reembolso de Estudi Test sigue fallando',
    );
  });

  it('avisa de que no hay pago que reembolsar', async () => {
    retryRefundActionMock.mockResolvedValue({ ok: true, outcome: 'not_applicable' });
    renderButton();

    await clickRetry();

    expect(await screen.findByRole('status')).toHaveTextContent('no tiene pago en Stripe');
  });

  it('traduce un rechazo de la action sin mostrar detalles internos', async () => {
    retryRefundActionMock.mockResolvedValue({ ok: false, code: 'NOT_IN_QUEUE' });
    renderButton();

    await clickRetry();

    expect(await screen.findByRole('status')).toHaveTextContent('ya no está en la cola');
  });

  it('se deshabilita y anuncia la carga mientras la action está en curso', async () => {
    let resolve: (value: unknown) => void = () => undefined;
    retryRefundActionMock.mockReturnValue(new Promise((r) => (resolve = r)));
    renderButton();

    await clickRetry();

    const button = screen.getByRole('button', { name: /Reintentando/ });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-busy', 'true');

    resolve({ ok: true, outcome: 'succeeded' });
    expect(await screen.findByRole('button', { name: /Reintentar el reembolso/ })).toBeEnabled();
  });
});
