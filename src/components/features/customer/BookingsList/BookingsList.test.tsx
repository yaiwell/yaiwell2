import { render, screen, within } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { describe, expect, it } from 'vitest';

import type { CustomerBooking } from '@/lib/fake-data/customer-bookings';

import { BookingsList } from './BookingsList';

/**
 * Tests del listado de reservas del área cliente.
 *
 * Cubrimos:
 *  - Que cada sección renderiza el número correcto de cards.
 *  - Que cuando una sección está vacía aparece el mensaje empty
 *    correspondiente en lugar del grid.
 *  - Que las reservas próximas a menos de 2h muestran el hint de
 *    cancelación bloqueada y el botón "Cancelar" queda deshabilitado
 *    (regla §4.bis).
 */

const NOW = new Date('2026-05-27T10:00:00+02:00');

function inHours(h: number): Date {
  return new Date(NOW.getTime() + h * 60 * 60 * 1000);
}

function buildBooking(overrides: Partial<CustomerBooking> = {}): CustomerBooking {
  return {
    id: overrides.id ?? 'bkg-test',
    status: overrides.status ?? 'confirmed',
    startAt: overrides.startAt ?? inHours(5),
    endAt: overrides.endAt ?? inHours(6),
    priceCents: overrides.priceCents ?? 4500,
    serviceId: overrides.serviceId ?? 'svc-x',
    serviceName: overrides.serviceName ?? { es: 'Masaje relax', ca: 'Massatge relax' },
    professionalName: overrides.professionalName ?? 'Eva M.',
    providerId: overrides.providerId ?? 'prov-test',
    providerName: overrides.providerName ?? 'Casa Mar',
    providerSlug: overrides.providerSlug ?? 'casa-mar',
    providerAddress: overrides.providerAddress ?? 'Carrer X 1, Gràcia',
    providerPhoto: overrides.providerPhoto ?? 'https://example.com/photo.jpg',
    hasReview: overrides.hasReview ?? false,
    notes: overrides.notes,
  };
}

const messages = {
  customerArea: {
    sections: {
      count: '{count, plural, =0 {Sin elementos} one {# elemento} other {# elementos}}',
      upcoming: { title: 'Próximas reservas', empty: 'Sin próximas reservas.' },
      pendingReview: {
        title: 'Valoraciones pendientes',
        empty: 'No tienes nada por valorar.',
      },
      past: { title: 'Historial', empty: 'Sin historial.' },
    },
    status: {
      pending: 'Pendiente',
      confirmed: 'Confirmada',
      completed: 'Completada',
      cancelled: 'Cancelada',
      refunded: 'Reembolsada',
    },
    actions: {
      viewDetail: 'Ver detalle',
      cancel: 'Cancelar',
      cancelling: 'Cancelando…',
      cancelledHint: 'Cancelación solicitada',
      cancelBlockedHint: 'Solo se puede cancelar con más de 2 h de antelación.',
      review: 'Valorar',
    },
  },
};

function renderWithIntl(ui: React.ReactNode) {
  return render(
    <NextIntlClientProvider locale="es" messages={messages} timeZone="Europe/Madrid">
      {ui}
    </NextIntlClientProvider>,
  );
}

describe('BookingsList', () => {
  it('renderiza el número correcto de cards en cada sección', () => {
    const upcoming = [
      buildBooking({ id: 'bkg-up-1', startAt: inHours(4) }),
      buildBooking({ id: 'bkg-up-2', startAt: inHours(8) }),
    ];
    const pendingReview = [
      buildBooking({ id: 'bkg-rev-1', status: 'completed', startAt: inHours(-48) }),
    ];
    const past = [
      buildBooking({ id: 'bkg-past-1', status: 'cancelled', startAt: inHours(-72) }),
      buildBooking({ id: 'bkg-past-2', status: 'refunded', startAt: inHours(-96) }),
    ];

    renderWithIntl(
      <BookingsList upcoming={upcoming} pendingReview={pendingReview} past={past} now={NOW} />,
    );

    const upcomingSection = screen.getByRole('region', { name: 'Próximas reservas' });
    const reviewSection = screen.getByRole('region', { name: 'Valoraciones pendientes' });
    const pastSection = screen.getByRole('region', { name: 'Historial' });

    expect(within(upcomingSection).getAllByRole('article')).toHaveLength(2);
    expect(within(reviewSection).getAllByRole('article')).toHaveLength(1);
    expect(within(pastSection).getAllByRole('article')).toHaveLength(2);
  });

  it('muestra el mensaje empty cuando no hay valoraciones pendientes', () => {
    renderWithIntl(
      <BookingsList
        upcoming={[buildBooking({ id: 'bkg-up-only' })]}
        pendingReview={[]}
        past={[]}
        now={NOW}
      />,
    );

    expect(screen.getByText('No tienes nada por valorar.')).toBeInTheDocument();
    expect(screen.getByText('Sin historial.')).toBeInTheDocument();
  });

  it('bloquea el botón cancelar cuando faltan menos de 2 horas', () => {
    // 1h 30min al inicio: por debajo del umbral §4.bis, no cancelable.
    const tooClose = buildBooking({ id: 'bkg-close', startAt: inHours(1.5) });

    renderWithIntl(<BookingsList upcoming={[tooClose]} pendingReview={[]} past={[]} now={NOW} />);

    const cancelButton = screen.getByRole('button', { name: 'Cancelar' });
    expect(cancelButton).toBeDisabled();
    expect(
      screen.getByText('Solo se puede cancelar con más de 2 h de antelación.'),
    ).toBeInTheDocument();
  });

  it('permite cancelar cuando faltan más de 2 horas', () => {
    const farEnough = buildBooking({ id: 'bkg-far', startAt: inHours(5) });

    renderWithIntl(<BookingsList upcoming={[farEnough]} pendingReview={[]} past={[]} now={NOW} />);

    const cancelButton = screen.getByRole('button', { name: 'Cancelar' });
    expect(cancelButton).toBeEnabled();
  });

  it('muestra el CTA Valorar en la sección de valoraciones pendientes', () => {
    const reviewable = buildBooking({
      id: 'bkg-rev',
      status: 'completed',
      startAt: inHours(-24),
    });

    renderWithIntl(<BookingsList upcoming={[]} pendingReview={[reviewable]} past={[]} now={NOW} />);

    expect(screen.getByRole('button', { name: /Valorar/ })).toBeInTheDocument();
  });
});
