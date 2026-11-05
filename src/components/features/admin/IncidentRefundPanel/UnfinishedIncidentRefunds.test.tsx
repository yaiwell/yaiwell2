import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NextIntlClientProvider } from 'next-intl';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import es from '@/messages/es.json';

import { UnfinishedIncidentRefunds } from './UnfinishedIncidentRefunds';

/**
 * Tests de la lista de reembolsos a medias: se ve sin pegar el id, completa con
 * la acción de reanudar y el aviso sobrevive aunque la fila desaparezca.
 */

const resumeMock = vi.hoisted(() => vi.fn());

vi.mock('@/app/[locale]/admin/reembolsos/incident-actions', () => ({
  resumeIncidentRefundAction: resumeMock,
  issueIncidentRefundAction: vi.fn(),
  previewIncidentRefundAction: vi.fn(),
}));

const messages = { adminArea: { refunds: es.adminArea.refunds } };
const copy = es.adminArea.refunds;
const REFUND = {
  bookingId: 'bk-1',
  providerName: 'Estudi Test',
  serviceName: 'Corte',
  priceCents: 4500,
  startAt: new Date('2026-11-05T11:00:00.000Z'),
  incidentRefundAt: new Date('2026-11-05T10:00:00.000Z'),
};

function renderList(refunds = [REFUND]) {
  const tree = (list: (typeof REFUND)[]) => (
    <NextIntlClientProvider locale="es" messages={messages} timeZone="Europe/Madrid">
      <UnfinishedIncidentRefunds refunds={list} locale="es" />
    </NextIntlClientProvider>
  );
  const view = render(tree(refunds));
  return { rerenderWith: (list: (typeof REFUND)[]) => view.rerender(tree(list)) };
}

describe('UnfinishedIncidentRefunds', () => {
  beforeEach(() => resumeMock.mockReset());

  it('sin filas no enseña la sección', () => {
    renderList([]);

    expect(screen.queryByText(copy.unfinished.title)).not.toBeInTheDocument();
  });

  it('enseña la reserva con su botón, sin pegar el id', () => {
    renderList();

    expect(screen.getByText(copy.unfinished.title)).toBeInTheDocument();
    expect(screen.getByText('Estudi Test')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Completar el reembolso de Estudi Test/ }),
    ).toBeTruthy();
  });

  it('completa con la acción de reanudar y el aviso sobrevive a la fila', async () => {
    resumeMock.mockResolvedValue({ ok: true, outcome: 'issued', slot: 'blocked' });
    const user = userEvent.setup();
    const { rerenderWith } = renderList();

    await user.click(screen.getByRole('button', { name: /Completar el reembolso/ }));

    expect(resumeMock).toHaveBeenCalledWith('es', 'bk-1');
    expect(await screen.findByText(/reembolso de 45,00.* emitido/)).toBeInTheDocument();

    rerenderWith([]);

    expect(screen.getByText(/reembolso de 45,00.* emitido/)).toBeInTheDocument();
    expect(screen.getByText(copy.incident.slot.blocked)).toBeInTheDocument();
  });

  it('si otra reanudación sigue en curso lo dice', async () => {
    resumeMock.mockResolvedValue({ ok: false, code: 'NOT_ELIGIBLE', reason: 'in_progress' });
    const user = userEvent.setup();
    renderList();

    await user.click(screen.getByRole('button', { name: /Completar el reembolso/ }));

    expect(await screen.findByText(copy.incident.ineligible.in_progress)).toBeInTheDocument();
  });
});
