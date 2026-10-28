import { render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { describe, expect, it } from 'vitest';

import type { DiscountChange } from './BookingFlow.price';
import { DiscountChangeNotice } from './DiscountChangeNotice';

/**
 * Tests del aviso de descuento perdido o cambiado antes de pagar: debe
 * anunciarse (`role="status"`) y citar el importe del servidor.
 */

const messages = {
  booking: {
    slotOffer: {
      discountLost:
        'El descuento de este hueco ya no está disponible. El importe a pagar es {amount}.',
      discountChanged:
        'El descuento de este hueco ha cambiado: ahora es del {pct} %. El importe a pagar es {amount}.',
    },
  },
};

function renderNotice(change: DiscountChange) {
  return render(
    <NextIntlClientProvider locale="es" messages={messages}>
      <DiscountChangeNotice change={change} locale="es" />
    </NextIntlClientProvider>,
  );
}

describe('DiscountChangeNotice', () => {
  it('explica que el descuento ya no está con el importe real', () => {
    renderNotice({ kind: 'lost', amountCents: 4500 });
    const notice = screen.getByRole('status');
    expect(notice).toHaveTextContent('El descuento de este hueco ya no está disponible');
    expect(notice).toHaveTextContent('45 €');
  });

  it('explica que el descuento ha cambiado con el nuevo % e importe', () => {
    renderNotice({ kind: 'changed', amountCents: 4050, discountPct: 10 });
    const notice = screen.getByRole('status');
    expect(notice).toHaveTextContent('ahora es del 10 %');
    expect(notice).toHaveTextContent('40,50 €');
  });
});
