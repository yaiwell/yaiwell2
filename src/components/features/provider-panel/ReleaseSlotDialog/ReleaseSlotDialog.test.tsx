import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NextIntlClientProvider } from 'next-intl';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import messages from '@/messages/es.json';

// Las actions reales arrastran Prisma y Clerk: aquí solo se comprueba
// qué se les envía y cómo se pinta su respuesta.
const releaseCancelledSlotActionMock = vi.fn();
const releaseFreeSlotActionMock = vi.fn();
const cancelBookingActionMock = vi.fn();
vi.mock('@/app/[locale]/panel/calendario/slot-offers.actions', () => ({
  releaseCancelledSlotAction: (...args: unknown[]) => releaseCancelledSlotActionMock(...args),
  releaseFreeSlotAction: (...args: unknown[]) => releaseFreeSlotActionMock(...args),
  withdrawSlotOfferAction: vi.fn(),
}));
vi.mock('@/app/[locale]/panel/calendario/actions', () => ({
  cancelBookingAction: (...args: unknown[]) => cancelBookingActionMock(...args),
  completeBookingAction: vi.fn(),
}));

import { BookingCancelButton } from '../BookingActionsList';
import { ReleaseFreeSlotButton, ReleaseSlotPromptProvider } from './index';
import {
  getDiscountIssue,
  getTiersForTarget,
  stepDiscount,
  toSubmittedDiscounts,
} from './ReleaseSlotDialog.logic';

describe('ReleaseSlotDialog.logic', () => {
  it('da por buenos los tramos por defecto', () => {
    expect(getDiscountIssue({ over2h: 10, oneToTwoHours: 20, underOneHour: 30 })).toBeNull();
    expect(getDiscountIssue({ over2h: 0, oneToTwoHours: 20, underOneHour: 30 })).toBeNull();
  });

  it('explica que el descuento no puede bajar al acercarse la hora', () => {
    expect(getDiscountIssue({ over2h: 30, oneToTwoHours: 20, underOneHour: 30 })).toBe(
      'decreasing',
    );
    expect(getDiscountIssue({ over2h: 0, oneToTwoHours: 40, underOneHour: 30 })).toBe('decreasing');
  });

  it('exige al menos un 5 % en la última hora', () => {
    expect(getDiscountIssue({ over2h: 0, oneToTwoHours: 0, underOneHour: 0 })).toBe(
      'underOneHourMin',
    );
  });

  it('marca como fuera de rango lo que no va en pasos de 5 o pasa del tope', () => {
    expect(getDiscountIssue({ over2h: 0, oneToTwoHours: 12, underOneHour: 20 })).toBe('outOfRange');
    expect(getDiscountIssue({ over2h: 0, oneToTwoHours: 20, underOneHour: 55 })).toBe('outOfRange');
  });

  it('mueve los tramos en pasos de 5 sin salirse de sus límites', () => {
    expect(stepDiscount(10, 1, 'over2h')).toBe(15);
    expect(stepDiscount(0, -1, 'over2h')).toBe(0);
    expect(stepDiscount(50, 1, 'underOneHour')).toBe(50);
    expect(stepDiscount(5, -1, 'underOneHour')).toBe(5);
  });

  it('en un hueco libre pide 2 tramos y envía el de más de 2 h a 0', () => {
    expect(getTiersForTarget('free')).toEqual(['oneToTwoHours', 'underOneHour']);
    expect(getTiersForTarget('cancelled')).toHaveLength(3);
    expect(
      toSubmittedDiscounts('free', { over2h: 10, oneToTwoHours: 20, underOneHour: 30 }),
    ).toEqual({ over2h: 0, oneToTwoHours: 20, underOneHour: 30 });
  });
});

/** Inicio a 3 h vista: el tramo vigente es «más de 2 h». */
const START_IN_3H = () => new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString();

function renderWithProvider(ui: ReactNode) {
  return render(
    <NextIntlClientProvider locale="es" messages={messages}>
      <ReleaseSlotPromptProvider locale="es">{ui}</ReleaseSlotPromptProvider>
    </NextIntlClientProvider>,
  );
}

describe('ReleaseSlotDialog tras cancelar', () => {
  beforeEach(() => {
    releaseCancelledSlotActionMock.mockReset();
    releaseFreeSlotActionMock.mockReset();
    cancelBookingActionMock.mockReset();
  });

  async function cancelBooking(code: { ok: true } | { ok: false; code: 'REFUND_FAILED' }) {
    cancelBookingActionMock.mockResolvedValueOnce(code);
    const user = userEvent.setup();
    renderWithProvider(
      <BookingCancelButton
        locale="es"
        bookingId="bk-1"
        startAtIso={START_IN_3H()}
        initialCancellable
      />,
    );
    await user.click(screen.getByRole('button', { name: /Cancelar reserva/ }));
    await user.click(screen.getByRole('button', { name: 'Sí, cancelar y reembolsar' }));
    return user;
  }

  it('ofrece liberar el hueco con 3 tramos y valores por defecto 10/20/30', async () => {
    await cancelBooking({ ok: true });

    expect(
      await screen.findByText('Hueco libre. ¿Quieres ofrecerlo con descuento?'),
    ).toBeInTheDocument();
    expect(screen.getByText('10 %')).toBeInTheDocument();
    expect(screen.getByText('20 %')).toBeInTheDocument();
    expect(screen.getByText('30 %')).toBeInTheDocument();
    expect(screen.getByText('Ahora')).toBeInTheDocument();
  });

  it('también lo ofrece si el reembolso falló, con el aviso', async () => {
    await cancelBooking({ ok: false, code: 'REFUND_FAILED' });

    expect(await screen.findByText(/el reembolso no ha podido emitirse/i)).toBeInTheDocument();
    expect(screen.getByText('Hueco libre. ¿Quieres ofrecerlo con descuento?')).toBeInTheDocument();
  });

  it('valida en vivo y bloquea el envío si un tramo cercano rebaja menos', async () => {
    const user = await cancelBooking({ ok: true });
    await screen.findByText('Hueco libre. ¿Quieres ofrecerlo con descuento?');

    // Subimos «más de 2 h» de 10 a 25: supera al tramo de 1–2 h (20).
    const raise = screen.getByRole('button', { name: 'Subir descuento: Con más de 2 h de margen' });
    await user.click(raise);
    await user.click(raise);
    await user.click(raise);

    expect(
      screen.getByText(/El descuento no puede bajar al acercarse la hora/),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ofrecer con descuento' })).toBeDisabled();
  });

  it('envía los tramos y muestra la confirmación', async () => {
    releaseCancelledSlotActionMock.mockResolvedValueOnce({ ok: true });
    const user = await cancelBooking({ ok: true });
    await screen.findByText('Hueco libre. ¿Quieres ofrecerlo con descuento?');

    await user.click(screen.getByRole('button', { name: 'Ofrecer con descuento' }));

    expect(releaseCancelledSlotActionMock).toHaveBeenCalledWith('es', {
      bookingId: 'bk-1',
      discounts: { over2h: 10, oneToTwoHours: 20, underOneHour: 30 },
    });
    expect(await screen.findByText('Hueco liberado')).toBeInTheDocument();
  });

  it('traduce el código de error de la action', async () => {
    releaseCancelledSlotActionMock.mockResolvedValueOnce({ ok: false, code: 'SLOT_TAKEN' });
    const user = await cancelBooking({ ok: true });
    await screen.findByText('Hueco libre. ¿Quieres ofrecerlo con descuento?');

    await user.click(screen.getByRole('button', { name: 'Ofrecer con descuento' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Este hueco ya no está libre.');
  });

  it('«Omitir» cierra sin publicar nada', async () => {
    const user = await cancelBooking({ ok: true });
    await screen.findByText('Hueco libre. ¿Quieres ofrecerlo con descuento?');

    await user.click(screen.getByRole('button', { name: 'Omitir' }));

    expect(
      screen.queryByText('Hueco libre. ¿Quieres ofrecerlo con descuento?'),
    ).not.toBeInTheDocument();
    expect(releaseCancelledSlotActionMock).not.toHaveBeenCalled();
  });
});

describe('ReleaseFreeSlotButton', () => {
  it('abre el diálogo en modo hueco libre con 2 tramos y envía over2h a 0', async () => {
    releaseFreeSlotActionMock.mockResolvedValueOnce({ ok: true });
    const startAtIso = new Date(Date.now() + 90 * 60 * 1000).toISOString();
    const user = userEvent.setup();
    renderWithProvider(
      <ReleaseFreeSlotButton
        serviceId="svc-1"
        serviceName="Corte mujer"
        startAtIso={startAtIso}
        startTime="17:30"
      />,
    );

    await user.click(
      screen.getByRole('button', { name: 'Liberar con descuento Corte mujer a las 17:30' }),
    );

    expect(screen.getByText('Corte mujer · 17:30')).toBeInTheDocument();
    expect(screen.queryByText('Con más de 2 h de margen')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Ofrecer con descuento' }));
    expect(releaseFreeSlotActionMock).toHaveBeenCalledWith('es', {
      serviceId: 'svc-1',
      startAtIso,
      discounts: { over2h: 0, oneToTwoHours: 20, underOneHour: 30 },
    });
  });

  it('queda deshabilitado en modo preview', () => {
    renderWithProvider(
      <ReleaseFreeSlotButton
        serviceId="svc-1"
        serviceName="Corte mujer"
        startAtIso="1970-01-01T00:00:00.000Z"
        startTime="17:30"
        disabled
      />,
    );

    expect(screen.getByRole('button', { name: /Liberar con descuento/ })).toBeDisabled();
  });
});
