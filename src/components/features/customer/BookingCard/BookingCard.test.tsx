import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { CustomerBookingView } from '@/lib/services/customer-bookings';
import messages from '@/messages/es.json';

import { BookingCard } from './BookingCard';

// El diálogo de cancelar importa la server action; su UI se prueba en
// `CancelBookingDialog.test.tsx`. Vitest eleva `vi.mock` sobre los imports.
vi.mock('@/app/[locale]/mis-reservas/cancel-actions', () => ({
  cancelMyBookingAction: vi.fn(),
}));

/**
 * Cancelación en la card de "Próximas reservas" (§4.bis). La card no
 * decide si se puede cancelar: pinta el veredicto `cancellation` que
 * calcula el servicio. Usamos los mensajes reales de `es.json`.
 */

const START = new Date('2026-10-05T16:00:00.000Z');

function booking(
  createdAt: Date,
  overrides: Partial<CustomerBookingView> = {},
): CustomerBookingView {
  return {
    id: 'bkg-1',
    status: 'confirmed',
    paymentMode: 'online',
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
    completedAt: null,
    hasReview: false,
    review: null,
    canReview: false,
    reviewWindowClosed: false,
    cancellation: { kind: 'allowed', refundCents: 4500, untilStart: false },
    ...overrides,
  };
}

function renderCard(
  createdAt: Date,
  overrides: Partial<CustomerBookingView> = {},
  variant: 'upcoming' | 'past' | 'pendingReview' = 'upcoming',
) {
  return render(
    <NextIntlClientProvider locale="es" messages={messages} timeZone="Europe/Madrid">
      <BookingCard booking={booking(createdAt, overrides)} variant={variant} />
    </NextIntlClientProvider>,
  );
}

describe('BookingCard — cancelación', () => {
  const CREATED = new Date(START.getTime() - 24 * 60 * 60_000);
  const a = messages.customerArea.actions;
  const cancelButton = () => screen.queryByRole('button', { name: a.cancel });

  beforeEach(() => {
    // El diálogo vigila el reloj: lo fijamos un día antes de la cita.
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(CREATED);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('ofrece «Cancelar reserva» cuando el servidor lo permite', () => {
    renderCard(CREATED);

    expect(cancelButton()).toBeInTheDocument();
    expect(screen.queryByText(a.lastMinuteHint)).not.toBeInTheDocument();
  });

  it('en una reserva de última hora dice que no admite cancelación, sin botón', () => {
    renderCard(CREATED, { cancellation: { kind: 'lastMinute' } });

    expect(screen.getByText(a.lastMinuteHint)).toBeInTheDocument();
    expect(cancelButton()).not.toBeInTheDocument();
  });

  it('a menos de 2 h dice que ya no se puede cancelar, sin botón', () => {
    renderCard(CREATED, { cancellation: { kind: 'tooLate' } });

    expect(screen.getByText(a.tooLateHint)).toBeInTheDocument();
    expect(cancelButton()).not.toBeInTheDocument();
  });

  it('en el historial no ofrece nada sobre cancelar', () => {
    renderCard(CREATED, { status: 'cancelled', cancellation: { kind: 'none' } }, 'past');

    expect(cancelButton()).not.toBeInTheDocument();
    expect(screen.queryByText(a.tooLateHint)).not.toBeInTheDocument();
  });
});

/**
 * Valoración en la card (§4.bis). La card no decide si se puede valorar:
 * obedece a `canReview`, `review` y `reviewWindowClosed`, que calcula el
 * servicio. Aquí se fija que pinta lo correcto para cada combinación.
 */
describe('BookingCard — valoración', () => {
  const CREATED = new Date(START.getTime() - 7 * 24 * 60 * 60_000);
  const COMPLETED_AT = new Date(START.getTime() + 60 * 60_000);
  const reviewCta = () => screen.queryByRole('button', { name: /Valorar/ });
  const past = { cancellation: { kind: 'none' } } as const;

  it('muestra el CTA «Valorar» cuando canReview', () => {
    renderCard(
      CREATED,
      { status: 'completed', completedAt: COMPLETED_AT, canReview: true },
      'pendingReview',
    );

    expect(reviewCta()).toBeInTheDocument();
  });

  it.each(['pending', 'confirmed', 'cancelled', 'refunded'] as const)(
    'no muestra el CTA en una reserva %s',
    (status) => {
      renderCard(CREATED, { status, ...past }, 'past');

      expect(reviewCta()).not.toBeInTheDocument();
      expect(screen.queryByText(messages.customerArea.actions.reviewWindowClosed)).toBeNull();
    },
  );

  it('fuera de plazo no muestra el CTA y avisa de que el plazo está cerrado', () => {
    renderCard(
      CREATED,
      { status: 'completed', completedAt: COMPLETED_AT, reviewWindowClosed: true },
      'past',
    );

    expect(reviewCta()).not.toBeInTheDocument();
    expect(screen.getByText(messages.customerArea.actions.reviewWindowClosed)).toBeInTheDocument();
  });

  it('con reseña existente muestra la nota y el texto, sin CTA', () => {
    renderCard(
      CREATED,
      {
        status: 'completed',
        completedAt: COMPLETED_AT,
        hasReview: true,
        review: { rating: 4, text: 'Muy buen masaje, volveré.' },
      },
      'past',
    );

    expect(reviewCta()).not.toBeInTheDocument();
    expect(screen.getByText('Tu valoración:')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: '4 de 5 estrellas' })).toBeInTheDocument();
    expect(screen.getByText('Muy buen masaje, volveré.')).toBeInTheDocument();
  });

  it('pliega una reseña larga y la despliega con «Ver más»', async () => {
    const user = userEvent.setup();
    const longText = `${'Una experiencia estupenda de principio a fin. '.repeat(8)}Final.`;
    renderCard(
      CREATED,
      {
        status: 'completed',
        completedAt: COMPLETED_AT,
        hasReview: true,
        review: { rating: 5, text: longText },
      },
      'past',
    );

    expect(screen.queryByText(longText)).toBeNull();
    const toggle = screen.getByRole('button', { name: 'Ver más' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');

    await user.click(toggle);

    expect(screen.getByText(longText)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ver menos' })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
  });
});
