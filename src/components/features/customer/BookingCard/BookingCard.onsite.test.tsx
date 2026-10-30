import { render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { describe, expect, it, vi } from 'vitest';

import type { CustomerBookingView } from '@/lib/services/customer-bookings';
import messages from '@/messages/es.json';

import { OnsiteRestrictionNotice } from '../OnsiteRestrictionNotice';

import { BookingCard } from './BookingCard';

vi.mock('@/app/[locale]/mis-reservas/cancel-actions', () => ({ cancelMyBookingAction: vi.fn() }));

/**
 * `/mis-reservas` con pago en el local y no presentados (§4.bis):
 * etiqueta «Pago en el local», estado «No presentado» y aviso de bloqueo.
 */

const START = new Date('2026-10-05T16:00:00.000Z');

function booking(overrides: Partial<CustomerBookingView> = {}): CustomerBookingView {
  return {
    id: 'bkg-1',
    status: 'confirmed',
    paymentMode: 'onsite',
    startAt: START,
    endAt: new Date(START.getTime() + 60 * 60_000),
    createdAt: new Date('2026-10-01T10:00:00.000Z'),
    priceCents: 4500,
    serviceId: 'svc-1',
    serviceName: { es: 'Masaje relax', ca: 'Massatge relax' },
    professionalName: 'Eva M.',
    providerId: 'prov-1',
    providerName: 'Casa Mar',
    providerSlug: 'casa-mar',
    providerAddress: 'Carrer X 1',
    providerPhoto: null,
    completedAt: null,
    hasReview: false,
    review: null,
    canReview: false,
    reviewWindowClosed: false,
    cancellation: { kind: 'none' },
    ...overrides,
  };
}

function renderWithIntl(node: React.ReactNode) {
  render(
    <NextIntlClientProvider locale="es" messages={messages} timeZone="Europe/Madrid">
      {node}
    </NextIntlClientProvider>,
  );
}

describe('BookingCard · pago en el local', () => {
  it('lleva la etiqueta «Pago en el local»', () => {
    renderWithIntl(<BookingCard booking={booking()} variant="past" />);
    expect(screen.getByText('Pago en el local')).toBeInTheDocument();
  });

  it('online no lleva etiqueta; un no presentado se nombra como tal', () => {
    renderWithIntl(
      <BookingCard
        booking={booking({ paymentMode: 'online', status: 'no_show' })}
        variant="past"
      />,
    );
    expect(screen.queryByText('Pago en el local')).toBeNull();
    expect(screen.getByRole('status')).toHaveTextContent('No presentado');
  });
});

describe('OnsiteRestrictionNotice', () => {
  it('dice hasta cuándo solo se puede pagar online (dd/mm, hora de Madrid)', () => {
    renderWithIntl(<OnsiteRestrictionNotice until={new Date('2027-02-09T23:30:00.000Z')} />);
    const notice = screen.getByRole('status');
    expect(notice).toHaveTextContent('Por ahora solo puedes pagar online');
    expect(notice).toHaveTextContent('Hasta el 10/02');
  });
});
