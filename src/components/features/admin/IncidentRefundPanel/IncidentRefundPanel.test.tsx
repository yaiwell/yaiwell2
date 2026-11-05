import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NextIntlClientProvider } from 'next-intl';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import es from '@/messages/es.json';

import { IncidentRefundPanel } from './IncidentRefundPanel';

/**
 * Tests del bloque de reembolso por incidencia.
 *
 * Se protege lo que puede salir caro: que el motivo corto no llegue a la
 * action, que cambiar el id invalide el resumen, que una reserva no elegible
 * no muestre el botón, y que `failed` diga que queda en la cola.
 */

const mocks = vi.hoisted(() => ({ preview: vi.fn(), issue: vi.fn(), resume: vi.fn() }));

vi.mock('@/app/[locale]/admin/reembolsos/incident-actions', () => ({
  previewIncidentRefundAction: mocks.preview,
  issueIncidentRefundAction: mocks.issue,
  resumeIncidentRefundAction: mocks.resume,
}));

const BOOKING_ID = '6f1c2b8e-1d2a-4c3b-9e4f-5a6b7c8d9e0f';
const NOTE = 'El centro ha sufrido una avería eléctrica';
const CONFIRM = /Cancelar y reembolsar/;
const messages = { adminArea: { refunds: es.adminArea.refunds } };
const copy = es.adminArea.refunds.incident;

function preview(overrides: Record<string, unknown> = {}) {
  return {
    ok: true,
    preview: {
      bookingId: BOOKING_ID,
      providerName: 'Estudi Test',
      serviceName: 'Corte',
      startAtIso: '2026-11-05T11:00:00.000Z',
      priceCents: 4500,
      status: 'confirmed',
      eligibility: { eligible: true, mode: 'new' },
      canResendNotices: false,
      ...overrides,
    },
  };
}

async function searchBooking() {
  const user = userEvent.setup();
  render(
    <NextIntlClientProvider locale="es" messages={messages}>
      <IncidentRefundPanel locale="es" />
    </NextIntlClientProvider>,
  );
  await user.type(screen.getByLabelText(copy.lookup.label), BOOKING_ID);
  await user.click(screen.getByRole('button', { name: copy.lookup.submit }));
  return user;
}

async function refundWithNote(user: ReturnType<typeof userEvent.setup>, note = NOTE) {
  await user.type(await screen.findByLabelText(copy.note.label), note);
  await user.click(screen.getByRole('button', { name: CONFIRM }));
}

describe('IncidentRefundPanel', () => {
  beforeEach(() => {
    mocks.preview.mockReset();
    mocks.issue.mockReset();
    mocks.preview.mockResolvedValue(preview());
    mocks.resume.mockReset();
    mocks.issue.mockResolvedValue({ ok: true, outcome: 'issued', slot: 'blocked' });
  });

  it('pinta el resumen del servidor con el importe en el botón', async () => {
    await searchBooking();

    expect(await screen.findByText('Estudi Test')).toBeInTheDocument();
    expect(screen.getByText('Corte')).toBeInTheDocument();
    expect(screen.getByText('Confirmada')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: CONFIRM })).toHaveTextContent('45,00');
    expect(mocks.preview).toHaveBeenCalledWith('es', BOOKING_ID);
  });

  it('una reserva en el local explica por qué y no ofrece confirmar', async () => {
    mocks.preview.mockResolvedValue(
      preview({ eligibility: { eligible: false, reason: 'onsite' } }),
    );

    await searchBooking();

    expect(await screen.findByText(copy.ineligible.onsite)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: CONFIRM })).not.toBeInTheDocument();
  });

  it('no llama a la action con un motivo corto', async () => {
    const user = await searchBooking();

    await refundWithNote(user, 'corto');

    expect(await screen.findByRole('alert')).toHaveTextContent('de 10 a 500 caracteres');
    expect(mocks.issue).not.toHaveBeenCalled();
  });

  it('cambiar el id descarta el resumen: no se confirma una búsqueda anterior', async () => {
    const user = await searchBooking();
    await screen.findByRole('button', { name: CONFIRM });

    await user.type(screen.getByLabelText(copy.lookup.label), 'x');

    expect(screen.queryByRole('button', { name: CONFIRM })).not.toBeInTheDocument();
  });

  it('muestra issued y retira el formulario para no repetir', async () => {
    const user = await searchBooking();

    await refundWithNote(user);

    const status = await screen.findByText(/reembolso de 45,00.* emitido/);
    expect(status.closest('[role="status"]')).not.toBeNull();
    expect(mocks.issue).toHaveBeenCalledWith('es', BOOKING_ID, NOTE);
    expect(screen.queryByRole('button', { name: CONFIRM })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: copy.reset })).toBeInTheDocument();
  });

  it('muestra already_refunded sin decir que ha emitido nada', async () => {
    mocks.issue.mockResolvedValue({
      ok: true,
      outcome: 'already_refunded',
      slot: 'not_applicable',
    });
    const user = await searchBooking();

    await refundWithNote(user);

    expect(await screen.findByText(copy.outcome.already_refunded)).toBeInTheDocument();
  });

  it('failed dice que el dinero sigue sin devolverse y que queda en la cola', async () => {
    mocks.issue.mockResolvedValue({ ok: true, outcome: 'failed', slot: 'not_applicable' });
    const user = await searchBooking();

    await refundWithNote(user);

    const message = await screen.findByText(/sigue sin devolverse/);
    expect(message).toHaveTextContent('Queda en la cola');
  });

  it('si el fallo no quedó grabado no dice que esté en la cola', async () => {
    mocks.issue.mockResolvedValue({
      ok: true,
      outcome: 'failed_unrecorded',
      slot: 'not_applicable',
    });
    const user = await searchBooking();

    await refundWithNote(user);

    const message = await screen.findByText(/sigue sin devolverse/);
    expect(message).toHaveTextContent('tampoco hemos podido dejarlo en la cola');
    expect(message).toHaveTextContent('Completar el reembolso');
  });

  it('cuenta si la franja ha quedado bloqueada o no', async () => {
    mocks.issue.mockResolvedValue({ ok: true, outcome: 'issued', slot: 'not_blocked' });
    const user = await searchBooking();

    await refundWithNote(user);

    expect(await screen.findByText(copy.slot.not_blocked)).toBeInTheDocument();
  });

  it('una reserva a medias se completa sin pedir motivo', async () => {
    mocks.preview.mockResolvedValue(
      preview({ status: 'cancelled', eligibility: { eligible: true, mode: 'resume' } }),
    );
    mocks.resume.mockResolvedValue({ ok: true, outcome: 'issued', slot: 'blocked' });
    const user = await searchBooking();

    const complete = await screen.findByRole('button', { name: /Completar el reembolso/ });
    expect(screen.queryByLabelText(copy.note.label)).not.toBeInTheDocument();
    await user.click(complete);

    expect(await screen.findByText(copy.slot.blocked)).toBeInTheDocument();
    expect(mocks.resume).toHaveBeenCalledWith('es', BOOKING_ID);
    expect(mocks.issue).not.toHaveBeenCalled();
  });

  it.each(['partially_refunded', 'disputed', 'stripe_unavailable', 'in_progress'] as const)(
    'con %s explica el motivo y no ofrece confirmar',
    async (reason) => {
      mocks.preview.mockResolvedValue(preview({ eligibility: { eligible: false, reason } }));

      await searchBooking();

      expect(await screen.findByText(copy.ineligible[reason])).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: CONFIRM })).not.toBeInTheDocument();
    },
  );

  it('una ya devuelta y marcada permite reenviar los avisos sin pedir motivo', async () => {
    mocks.preview.mockResolvedValue(
      preview({
        status: 'refunded',
        eligibility: { eligible: false, reason: 'already_refunded' },
        canResendNotices: true,
      }),
    );
    mocks.resume.mockResolvedValue({ ok: true, outcome: 'already_refunded', slot: 'blocked' });
    const user = await searchBooking();

    await user.click(await screen.findByRole('button', { name: copy.confirm.resendLabel }));

    expect(await screen.findByText(copy.outcome.already_refunded)).toBeInTheDocument();
    expect(mocks.resume).toHaveBeenCalledWith('es', BOOKING_ID);
  });

  it('avisa a soporte si otra reserva ocupa la franja', async () => {
    mocks.issue.mockResolvedValue({ ok: true, outcome: 'issued', slot: 'taken' });
    const user = await searchBooking();

    await refundWithNote(user);

    expect(await screen.findByText(copy.slot.taken)).toBeInTheDocument();
  });

  it('no elegible al confirmar: explica el motivo y conserva lo escrito', async () => {
    mocks.issue.mockResolvedValue({ ok: false, code: 'NOT_ELIGIBLE', reason: 'in_queue' });
    const user = await searchBooking();

    await refundWithNote(user);

    expect(await screen.findByText(copy.ineligible.in_queue)).toBeInTheDocument();
    expect(screen.getByLabelText(copy.note.label)).toHaveValue(NOTE);
  });

  it('una respuesta perdida pide volver a buscar antes de repetir', async () => {
    mocks.issue.mockRejectedValue(new Error('network'));
    const user = await searchBooking();

    await refundWithNote(user);

    expect(await screen.findByText(copy.errors.INTERNAL)).toBeInTheDocument();
  });

  it('traduce la reserva inexistente al buscar', async () => {
    mocks.preview.mockResolvedValue({ ok: false, code: 'BOOKING_NOT_FOUND' });

    await searchBooking();

    expect(await screen.findByText(copy.errors.BOOKING_NOT_FOUND)).toBeInTheDocument();
  });
});
