import { render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { describe, expect, it } from 'vitest';

import messages from '@/messages/es.json';

import { formatCancellationDeadline } from '../BookingSummary/BookingSummary.logic';

import { PaymentPolicyNote } from './PaymentPolicyNote';

/**
 * Condiciones del paso de pago: manda el valor del servidor
 * (`isLastMinute`) y se avisa si corrige la estimación del navegador
 * (`changed`). Con `now` fijo para que el plazo no dependa del reloj.
 */

const START = '2026-10-05T16:00:00.000Z';
/** 4 h antes del inicio: el plazo de cancelación gratuita sigue abierto. */
const NOW_WITH_MARGIN = new Date('2026-10-05T12:00:00.000Z');

const policy = messages.booking.policy;
const changedText = messages.booking.payment.conditionsChanged;

function renderNote(props: { isLastMinute: boolean; changed: boolean; now?: Date }) {
  return render(
    <NextIntlClientProvider locale="es" messages={messages} timeZone="Europe/Madrid">
      <PaymentPolicyNote
        isLastMinute={props.isLastMinute}
        changed={props.changed}
        slotStartIso={START}
        locale="es"
        now={props.now ?? NOW_WITH_MARGIN}
      />
    </NextIntlClientProvider>,
  );
}

const cancelUntilText = policy.cancelUntil.replace(
  '{deadline}',
  formatCancellationDeadline(START, 'es'),
);

describe('PaymentPolicyNote', () => {
  it('con margen y sin cambios: fecha límite y ningún aviso', () => {
    renderNote({ isLastMinute: false, changed: false });
    expect(screen.getByText(cancelUntilText)).toBeInTheDocument();
    expect(screen.queryByText(changedText)).not.toBeInTheDocument();
    expect(screen.queryByText(messages.booking.lastMinute.policy)).not.toBeInTheDocument();
  });

  it('con margen pero corregido por el servidor: fecha límite y aviso de cambio', () => {
    renderNote({ isLastMinute: false, changed: true });
    expect(screen.getByText(cancelUntilText)).toBeInTheDocument();
    expect(screen.getByText(changedText)).toBeInTheDocument();
  });

  it('última hora sin cambios: política de última hora y ningún aviso', () => {
    renderNote({ isLastMinute: true, changed: false });
    expect(screen.getByText(messages.booking.lastMinute.policy)).toBeInTheDocument();
    expect(screen.queryByText(changedText)).not.toBeInTheDocument();
    expect(screen.queryByText(cancelUntilText)).not.toBeInTheDocument();
  });

  it('última hora corregida por el servidor: política de última hora y aviso', () => {
    renderNote({ isLastMinute: true, changed: true });
    expect(screen.getByText(messages.booking.lastMinute.policy)).toBeInTheDocument();
    expect(screen.getByText(changedText)).toBeInTheDocument();
  });

  it('si el plazo ha vencido mientras paga, no enseña una fecha pasada', () => {
    // 1h50 antes del inicio: el límite (inicio − 2 h) ya pasó.
    renderNote({
      isLastMinute: false,
      changed: false,
      now: new Date('2026-10-05T14:10:00.000Z'),
    });
    expect(screen.getByText(policy.cancelWindowPassed)).toBeInTheDocument();
    expect(screen.queryByText(cancelUntilText)).not.toBeInTheDocument();
  });
});
