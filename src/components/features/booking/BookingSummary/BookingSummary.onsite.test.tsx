import { render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { describe, expect, it, vi } from 'vitest';

import messages from '@/messages/es.json';
import type { Provider, Service } from '@/types/domain';

import type { BookingPaymentMethod } from '../BookingFlow/BookingFlow.types';

import { BookingSummary } from './BookingSummary';

/**
 * Tests del resumen con pago en el local (§4.bis): el selector aparece
 * solo si el negocio lo ofrece, y con el local elegido el total y la
 * política hablan de pagar allí y de cancelar «sin cargo».
 */

vi.mock('@/app/[locale]/centro/[slugWithId]/reservar/onsite-actions', () => ({}));

const provider = {
  id: 'p',
  name: 'Estudi Serena',
  photos: [],
  address: 'C/ 1',
} as unknown as Provider;
const service = {
  id: 's',
  name: { es: 'Corte', ca: 'Tall' },
  durationMinutes: 60,
  priceCents: 4500,
} as unknown as Service;

function renderSummary(paymentMethod: BookingPaymentMethod, onsite: string) {
  render(
    <NextIntlClientProvider locale="es" messages={messages} timeZone="Europe/Madrid">
      <BookingSummary
        provider={provider}
        service={service}
        locale="es"
        slotStartIso="2026-10-05T16:00:00.000Z"
        slotEndIso="2026-10-05T17:00:00.000Z"
        notes=""
        price={{ amountCents: 4500, originalPriceCents: null, discountPct: null, isEstimate: true }}
        isLastMinute={false}
        onNotesChange={() => {}}
        paymentOptions={{
          status: 'ready',
          options: { online: 'available', onsite, restrictedUntilIso: null } as never,
        }}
        paymentMethod={paymentMethod}
        onPaymentMethodChange={() => {}}
      />
    </NextIntlClientProvider>,
  );
}

describe('BookingSummary · pago en el local', () => {
  it('con el local elegido: total «A pagar en el local» y cancelación sin cargo', () => {
    renderSummary('onsite', 'available');

    expect(screen.getByRole('radio', { name: /Pagar en el local/ })).toBeChecked();
    expect(screen.getByText('A pagar en el local')).toBeInTheDocument();
    expect(screen.getByText(/sin cargo hasta el/)).toBeInTheDocument();
  });

  it('si el negocio no lo ofrece, ni selector ni textos del local', () => {
    renderSummary('online', 'not_offered');

    expect(screen.queryByRole('radio')).toBeNull();
    expect(screen.getByText(/con devolución íntegra/)).toBeInTheDocument();
  });
});
