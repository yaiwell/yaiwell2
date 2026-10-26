import { render, screen, within } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { describe, expect, it, vi } from 'vitest';

import type { PendingRefundSummary } from '@/lib/services/checkout';
import es from '@/messages/es.json';

import { RefundsQueue } from './RefundsQueue';

/**
 * Tests de la cola de reembolsos fallidos del panel admin.
 *
 * Usamos las claves reales de `es.json` para que una clave borrada o
 * renombrada rompa aquí y no en producción. La server action se mockea:
 * el botón la importa y arrastraría Clerk y Prisma al entorno de test.
 */

vi.mock('@/app/[locale]/admin/reembolsos/actions', () => ({ retryRefundAction: vi.fn() }));

const messages = { adminArea: { refunds: es.adminArea.refunds } };

function build(overrides: Partial<PendingRefundSummary> = {}): PendingRefundSummary {
  return {
    bookingId: 'booking-1',
    providerName: 'Estudi Test',
    serviceName: 'Corte de pelo',
    clientEmail: 'cliente@example.com',
    priceCents: 3850,
    startAt: new Date('2026-10-20T10:00:00Z'),
    cancelledAt: new Date('2026-10-19T09:00:00Z'),
    refundFailedAt: new Date('2026-10-19T09:01:00Z'),
    refundFailureReason: 'balance_insufficient: Insufficient funds in the connected account.',
    stripePaymentIntentId: 'pi_123',
    ...overrides,
  };
}

function renderQueue(refunds: PendingRefundSummary[]) {
  return render(
    <NextIntlClientProvider locale="es" messages={messages} timeZone="Europe/Madrid">
      <RefundsQueue refunds={refunds} locale="es" />
    </NextIntlClientProvider>,
  );
}

describe('RefundsQueue', () => {
  it('pinta una tarjeta por reembolso con todos sus datos', () => {
    renderQueue([
      build(),
      build({ bookingId: 'booking-2', providerName: 'Centro Dos', stripePaymentIntentId: null }),
    ]);

    const items = screen.getAllByRole('listitem');
    expect(items).toHaveLength(2);

    const first = within(items[0]);
    expect(first.getByText('Estudi Test')).toBeInTheDocument();
    expect(first.getByText('Corte de pelo')).toBeInTheDocument();
    expect(first.getByText('cliente@example.com')).toBeInTheDocument();
    expect(first.getByText(/38,50\s€/)).toBeInTheDocument();
    expect(first.getByText(/balance_insufficient/)).toBeInTheDocument();
    // La cita (10:00 UTC) se lee en hora peninsular: 12:00.
    expect(first.getByText(/20 oct 2026.*12:00/)).toBeInTheDocument();
    expect(first.getByRole('link', { name: /Ver pago en Stripe/ })).toHaveAttribute(
      'href',
      'https://dashboard.stripe.com/payments/pi_123',
    );
    expect(
      first.getByRole('button', { name: 'Reintentar el reembolso de Estudi Test' }),
    ).toBeEnabled();

    // Sin PaymentIntent no hay enlace a Stripe.
    const second = within(items[1]);
    expect(second.queryByRole('link')).not.toBeInTheDocument();
    expect(second.getByText('Sin pago asociado en Stripe')).toBeInTheDocument();
  });

  it('muestra el estado vacío cuando no hay reembolsos', () => {
    renderQueue([]);

    expect(screen.getByText('No hay reembolsos fallidos pendientes.')).toBeInTheDocument();
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
  });

  it('muestra siempre el aviso de que reintentar es seguro', () => {
    renderQueue([]);

    expect(screen.getByText(/no puede devolver el dinero dos veces/)).toBeInTheDocument();
    expect(screen.getByText(/dashboard de Stripe/)).toBeInTheDocument();
    expect(screen.queryByText(/24 h/)).not.toBeInTheDocument();
  });
});
