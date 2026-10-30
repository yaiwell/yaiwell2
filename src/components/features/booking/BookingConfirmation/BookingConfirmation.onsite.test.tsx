import { render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { describe, expect, it } from 'vitest';

import messages from '@/messages/es.json';
import type { Provider, Service } from '@/types/domain';

import { BookingConfirmation } from './BookingConfirmation';

/** Confirmación de una reserva con pago en el local (§4.bis). */

const provider = {
  id: 'p',
  name: 'Estudi Serena',
  photos: [],
  address: 'C/ 1',
} as unknown as Provider;
const service = {
  id: 's',
  name: { es: 'Corte' },
  durationMinutes: 60,
  priceCents: 4500,
} as unknown as Service;

describe('BookingConfirmation · en el local', () => {
  it('dice cuánto se pagará en el local y nunca «pago en curso»', () => {
    render(
      <NextIntlClientProvider locale="es" messages={messages} timeZone="Europe/Madrid">
        <BookingConfirmation
          provider={provider}
          service={service}
          locale="es"
          slotStartIso="2026-10-05T16:00:00.000Z"
          slotEndIso="2026-10-05T17:00:00.000Z"
          bookingId="bk-1"
          providerSlugWithId="serena-p"
          amountCents={4500}
          paymentMode="onsite"
          paymentPending
        />
      </NextIntlClientProvider>,
    );

    expect(screen.getByRole('heading', { name: '¡Reserva confirmada!' })).toBeInTheDocument();
    expect(screen.getByText(/Pagarás 45\s€ en el local/)).toBeInTheDocument();
    expect(screen.getByText('A pagar en el local')).toBeInTheDocument();
  });
});
