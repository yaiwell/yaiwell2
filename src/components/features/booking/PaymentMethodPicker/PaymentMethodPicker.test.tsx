import { fireEvent, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { describe, expect, it, vi } from 'vitest';

import messages from '@/messages/es.json';

import type { PaymentOptionsState } from '../BookingFlow/BookingFlow.paymentOptions';

import { PaymentMethodPicker } from './PaymentMethodPicker';

/**
 * Tests del selector de método de pago (§4.bis, pago en el local): solo
 * aparece si el negocio lo ofrece y explica por qué no se puede elegir.
 */

vi.mock('@/app/[locale]/centro/[slugWithId]/reservar/onsite-actions', () => ({}));

function ready(onsite: string, restrictedUntilIso: string | null = null): PaymentOptionsState {
  return {
    status: 'ready',
    options: { online: 'available', onsite, restrictedUntilIso } as never,
  };
}

function renderPicker(options: PaymentOptionsState, onChange = vi.fn()) {
  render(
    <NextIntlClientProvider locale="es" messages={messages} timeZone="Europe/Madrid">
      <PaymentMethodPicker options={options} value="online" onChange={onChange} locale="es" />
    </NextIntlClientProvider>,
  );
  return onChange;
}

describe('PaymentMethodPicker', () => {
  it('no se pinta si el negocio no lo ofrece o aún no se sabe', () => {
    renderPicker(ready('not_offered'));
    renderPicker({ status: 'loading' });
    renderPicker({ status: 'unavailable' });
    expect(screen.queryByRole('group')).toBeNull();
  });

  it('con el local disponible deja elegirlo', () => {
    const onChange = renderPicker(ready('available'));
    const onsite = screen.getByRole('radio', { name: /Pagar en el local/ });

    expect(onsite).toBeEnabled();
    fireEvent.click(onsite);
    expect(onChange).toHaveBeenCalledWith('onsite');
  });

  it('a última hora lo enseña desactivado con el motivo', () => {
    renderPicker(ready('last_minute'));
    const onsite = screen.getByRole('radio', { name: /Pagar en el local/ });

    expect(onsite).toBeDisabled();
    expect(onsite).toHaveAccessibleDescription(/menos de 2 h se pagan online/);
  });

  it('cliente bloqueado: dice hasta cuándo en dd/mm', () => {
    // 23:30 UTC del 9 de febrero = 10 de febrero en Madrid.
    renderPicker(ready('client_restricted', '2027-02-09T23:30:00.000Z'));
    const onsite = screen.getByRole('radio', { name: /Pagar en el local/ });

    expect(onsite).toBeDisabled();
    expect(onsite).toHaveAccessibleDescription(/hasta el 10\/02/);
  });
});
