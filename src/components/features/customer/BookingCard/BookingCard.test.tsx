import { render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { describe, expect, it } from 'vitest';

import type { CustomerBookingView } from '@/lib/services/customer-bookings';
import messages from '@/messages/es.json';

import { BookingCard } from './BookingCard';

/**
 * Aviso de cancelación de la card en "Próximas reservas".
 *
 * Una reserva de última hora (creada a menos de 2 h del inicio) no
 * admite cancelación: la card no puede invitar a "escríbenos para
 * cancelar". Usamos los mensajes reales de `es.json`.
 */

const START = new Date('2026-10-05T16:00:00.000Z');

function booking(createdAt: Date): CustomerBookingView {
  return {
    id: 'bkg-1',
    status: 'confirmed',
    startAt: START,
    endAt: new Date(START.getTime() + 60 * 60_000),
    createdAt,
    priceCents: 4500,
    serviceId: 'svc-1',
    serviceName: { es: 'Masaje relax', ca: 'Massatge relax' },
    professionalName: 'Eva M.',
    providerId: 'prov-1',
    providerName: 'Casa Mar',
    providerSlug: 'casa-mar',
    providerAddress: 'Carrer X 1',
    providerPhoto: null,
    hasReview: false,
  };
}

function renderCard(createdAt: Date) {
  return render(
    <NextIntlClientProvider locale="es" messages={messages} timeZone="Europe/Madrid">
      <BookingCard booking={booking(createdAt)} variant="upcoming" />
    </NextIntlClientProvider>,
  );
}

describe('BookingCard — aviso de cancelación', () => {
  it('en una reserva de última hora (1h59) dice que no admite cancelación', () => {
    renderCard(new Date(START.getTime() - 119 * 60_000));

    expect(screen.getByText(messages.customerArea.actions.lastMinuteHint)).toBeInTheDocument();
    expect(
      screen.queryByText(messages.customerArea.actions.cancelSupportHint),
    ).not.toBeInTheDocument();
  });

  it('en una reserva hecha con margen (2h00) mantiene el aviso de soporte', () => {
    renderCard(new Date(START.getTime() - 120 * 60_000));

    expect(screen.getByText(messages.customerArea.actions.cancelSupportHint)).toBeInTheDocument();
    expect(
      screen.queryByText(messages.customerArea.actions.lastMinuteHint),
    ).not.toBeInTheDocument();
  });
});
