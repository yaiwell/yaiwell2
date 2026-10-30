import { fireEvent, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { describe, expect, it, vi } from 'vitest';

import messages from '@/messages/es.json';

import type { OnsiteBookingState } from '../BookingFlow/BookingFlow.onsite';

import { OnsiteConfirmPanel } from './OnsiteConfirmPanel';
import { resolveOnsiteErrorAction } from './OnsiteConfirmPanel.logic';

/**
 * Tests del panel «Pagar en el local»: lo que se dice antes de confirmar
 * (importe, cancelación sin cargo, sanción) y la salida de cada fallo.
 */

vi.mock('@/app/[locale]/centro/[slugWithId]/reservar/onsite-actions', () => ({}));
vi.mock('@/i18n/navigation', () => ({
  Link: ({
    href,
    children,
    className,
  }: {
    href: string;
    children: React.ReactNode;
    className?: string;
  }) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}));

/** Hueco a una semana vista: la ventana de cancelación sigue abierta. */
const SLOT = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

function renderPanel(state: OnsiteBookingState) {
  const handlers = { onConfirm: vi.fn(), onChooseAnotherSlot: vi.fn(), onPayOnline: vi.fn() };
  render(
    <NextIntlClientProvider locale="es" messages={messages} timeZone="Europe/Madrid">
      <OnsiteConfirmPanel
        price={{ amountCents: 3000, originalPriceCents: null, discountPct: null, isEstimate: true }}
        slotStartIso={SLOT}
        locale="es"
        state={state}
        redirectUrl="/centro/aura-1/reservar?serviceId=svc"
        {...handlers}
      />
    </NextIntlClientProvider>,
  );
  return handlers;
}

describe('OnsiteConfirmPanel', () => {
  it('cuenta el importe, la cancelación sin cargo y la sanción antes de confirmar', () => {
    const { onConfirm } = renderPanel({ status: 'idle' });

    expect(screen.getByText('A pagar en el local')).toBeInTheDocument();
    expect(screen.getByText(/sin cargo hasta el/)).toBeInTheDocument();
    expect(screen.getByText(/sumarás 1 ausencia/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Confirmar reserva' }));
    expect(onConfirm).toHaveBeenCalled();
  });

  it('mientras se crea, el botón no admite otro clic', () => {
    renderPanel({ status: 'creating' });
    expect(screen.getByRole('button', { name: /Confirmando/ })).toBeDisabled();
  });

  it('si el local ya no vale, ofrece pagar online con el motivo', () => {
    const { onPayOnline } = renderPanel({
      status: 'error',
      error: { ok: false, code: 'ONSITE_NOT_ALLOWED', reason: 'last_minute' },
    });

    expect(screen.getByRole('alert')).toHaveTextContent(/menos de 2 h/);
    fireEvent.click(screen.getByRole('button', { name: 'Pagar online' }));
    expect(onPayOnline).toHaveBeenCalled();
  });

  it('sin sesión ofrece entrar o registrarse volviendo al flujo', () => {
    renderPanel({ status: 'error', error: { ok: false, code: 'UNAUTHENTICATED' } });
    const links = screen.getAllByRole('link').map((a) => a.getAttribute('href'));
    expect(links.some((href) => href?.startsWith('/entrar?redirect_url='))).toBe(true);
  });
});

describe('resolveOnsiteErrorAction', () => {
  it('cada fallo tiene su salida', () => {
    expect(resolveOnsiteErrorAction({ ok: false, code: 'SLOT_UNAVAILABLE' })).toBe('chooseSlot');
    expect(resolveOnsiteErrorAction({ ok: false, code: 'PENDING_ALREADY_PAID' })).toBe(
      'myBookings',
    );
    expect(resolveOnsiteErrorAction({ ok: false, code: 'INTERNAL' })).toBe('retry');
  });
});
