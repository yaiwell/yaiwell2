import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NextIntlClientProvider } from 'next-intl';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { OnsiteBillingSummary } from '@/lib/services/billing';
import messages from '@/messages/es.json';

/**
 * Tests de la tarjeta «Cobro en el local» de `/panel/plan` (§4.bis,
 * decidido 2026-10-30): interruptor, método de pago para las comisiones
 * y aviso de deuda.
 */

const toggleMock = vi.fn();
const setupMock = vi.fn();
vi.mock('@/app/[locale]/panel/plan/actions', () => ({
  toggleOnsitePaymentAction: (...args: unknown[]) => toggleMock(...args),
  startOnsiteSetupAction: (...args: unknown[]) => setupMock(...args),
  openBillingPortalAction: vi.fn(),
  startPlanCheckoutAction: vi.fn(),
}));

import { OnsitePaymentCard } from './OnsitePaymentCard';
import {
  canToggleOnsite,
  formatDebtDate,
  methodButtonKey,
  resolveOnsiteCardStatus,
  statusTextKey,
  toggleErrorKey,
} from './OnsitePaymentCard.logic';

function summary(overrides: Partial<OnsiteBillingSummary> = {}): OnsiteBillingSummary {
  return {
    enabled: false,
    effective: false,
    paymentMethodReady: true,
    paymentMethodReadyAt: new Date('2026-10-01T10:00:00.000Z'),
    commissionDebtSince: null,
    enableBlockedBy: null,
    outstandingCommissionCents: 0,
    overdueCommissionCents: 0,
    ...overrides,
  };
}

function renderCard(data: OnsiteBillingSummary) {
  render(
    <NextIntlClientProvider locale="es" messages={messages} timeZone="Europe/Madrid">
      <OnsitePaymentCard summary={data} locale="es" />
    </NextIntlClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('OnsitePaymentCard', () => {
  it('activa el pago en el local con el interruptor', async () => {
    toggleMock.mockResolvedValue({ ok: true, enabled: true });
    renderCard(summary());

    const toggle = screen.getByRole('switch', { name: 'Aceptar pago en el local' });
    expect(toggle).toHaveAttribute('aria-checked', 'false');
    await userEvent.click(toggle);
    expect(toggleMock).toHaveBeenCalledWith('es', true);
  });

  it('sin método de pago no deja activarlo y ofrece añadirlo', async () => {
    setupMock.mockResolvedValue({ ok: false, code: 'STRIPE_FAILED' });
    renderCard(summary({ paymentMethodReady: false, enableBlockedBy: 'payment_method_missing' }));

    expect(screen.getByRole('switch')).toBeDisabled();
    expect(screen.getByText(/añade un método de pago/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Añadir método de pago' }));
    expect(setupMock).toHaveBeenCalledWith('es');
    expect(await screen.findByRole('alert')).toBeInTheDocument();
  });

  it('con deuda: suspendido, aviso con la fecha e importes impagados', () => {
    renderCard(
      summary({
        enabled: true,
        commissionDebtSince: new Date('2026-10-20T10:00:00.000Z'),
        enableBlockedBy: 'commission_debt',
        overdueCommissionCents: 1250,
      }),
    );

    expect(screen.getByText(/Suspendido/)).toBeInTheDocument();
    expect(screen.getByText(/desde el 20\/10/)).toBeInTheDocument();
    expect(screen.getByText(/Comisiones impagadas/)).toBeInTheDocument();
    // Desactivar siempre se puede, aunque haya deuda.
    expect(screen.getByRole('switch')).toBeEnabled();
  });

  it('un rechazo del servidor se cuenta con su motivo', async () => {
    toggleMock.mockResolvedValue({ ok: false, code: 'COMMISSION_DEBT' });
    renderCard(summary());

    await userEvent.click(screen.getByRole('switch'));
    expect(await screen.findByRole('alert')).toHaveTextContent('comisiones sin pagar');
  });
});

describe('OnsitePaymentCard.logic', () => {
  it('estado y permiso del interruptor', () => {
    expect(resolveOnsiteCardStatus(summary())).toBe('off');
    expect(resolveOnsiteCardStatus(summary({ enabled: true, effective: true }))).toBe('on');
    expect(resolveOnsiteCardStatus(summary({ enabled: true }))).toBe('suspended');
    expect(canToggleOnsite(summary({ enableBlockedBy: 'commission_debt' }))).toBe(false);
    expect(toggleErrorKey('PAYMENT_METHOD_MISSING')).toBe('paymentMethodMissing');
    expect(toggleErrorKey('INTERNAL')).toBe('generic');
    expect(statusTextKey('suspended')).toBe('statusSuspended');
    expect(methodButtonKey(summary(), true)).toBe('redirecting');
    expect(methodButtonKey(summary({ paymentMethodReady: false }), false)).toBe('addMethod');
    expect(formatDebtDate(summary(), 'es')).toBeNull();
    expect(
      formatDebtDate(summary({ commissionDebtSince: new Date('2026-10-20T10:00:00Z') }), 'de'),
    ).toBe('20.10.');
  });
});
