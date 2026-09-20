import { render, screen, within } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { describe, expect, it } from 'vitest';

import type { CustomerBookingView } from '@/lib/services/customer-bookings';

import { BookingsList } from './BookingsList';
import { splitBookings } from './BookingsList.logic';

/**
 * Tests del listado de reservas del área cliente.
 *
 * Cubrimos:
 *  - Que cada sección renderiza el número correcto de cards.
 *  - Que cuando una sección está vacía aparece el mensaje empty
 *    correspondiente en lugar del grid (incluido el caso "cliente
 *    nuevo, cero reservas", que con datos fake nunca se ejecutaba).
 *  - Que las próximas reservas muestran el aviso de cancelación por
 *    soporte en lugar del antiguo botón simulado.
 *  - Que un proveedor sin fotos no renderiza un `<img>` vacío.
 *  - Que las horas se pintan en hora de Madrid, no en UTC.
 *  - La partición §4.bis: `completed` sin review va a "valoraciones
 *    pendientes", con review al historial, y `refunded` al historial.
 */

const NOW = new Date('2026-05-27T10:00:00+02:00');

function inHours(h: number): Date {
  return new Date(NOW.getTime() + h * 60 * 60 * 1000);
}

function buildBooking(overrides: Partial<CustomerBookingView> = {}): CustomerBookingView {
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
    providerPhoto:
      overrides.providerPhoto === undefined
        ? 'https://example.com/photo.jpg'
        : overrides.providerPhoto,
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
      pending: 'Pendiente de pago',
      confirmed: 'Confirmada',
      completed: 'Completada',
      cancelled: 'Cancelada',
      refunded: 'Reembolsada',
    },
    actions: {
      viewDetail: 'Ver detalle',
      cancelSupportHint: '¿Necesitas cancelar? Escríbenos y lo gestionamos contigo.',
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

    renderWithIntl(<BookingsList upcoming={upcoming} pendingReview={pendingReview} past={past} />);

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
      />,
    );

    expect(screen.getByText('No tienes nada por valorar.')).toBeInTheDocument();
    expect(screen.getByText('Sin historial.')).toBeInTheDocument();
  });

  it('renderiza las tres secciones vacías para un cliente sin reservas', () => {
    // Camino real de un usuario recién registrado: con `fakeCustomerBookings`
    // este render nunca llegaba a ejecutarse porque la lista nunca estaba vacía.
    const { upcoming, past, pendingReview } = splitBookings([], NOW);

    renderWithIntl(<BookingsList upcoming={upcoming} pendingReview={pendingReview} past={past} />);

    expect(screen.getByText('Sin próximas reservas.')).toBeInTheDocument();
    expect(screen.getByText('No tienes nada por valorar.')).toBeInTheDocument();
    expect(screen.getByText('Sin historial.')).toBeInTheDocument();
    expect(screen.queryAllByRole('article')).toHaveLength(0);
  });

  it('avisa de que la cancelación se gestiona por soporte en las próximas reservas', () => {
    const upcoming = buildBooking({ id: 'bkg-up', startAt: inHours(5) });

    renderWithIntl(<BookingsList upcoming={[upcoming]} pendingReview={[]} past={[]} />);

    expect(
      screen.getByText('¿Necesitas cancelar? Escríbenos y lo gestionamos contigo.'),
    ).toBeInTheDocument();
    // El botón simulado ya no existe: cobrado el pago, no podemos decirle
    // al cliente que ha cancelado algo que sigue en pie.
    expect(screen.queryByRole('button', { name: 'Cancelar' })).not.toBeInTheDocument();
  });

  it('no renderiza imagen cuando el proveedor no tiene fotos', () => {
    const noPhoto = buildBooking({ id: 'bkg-nophoto', providerPhoto: null });

    const { container } = renderWithIntl(
      <BookingsList upcoming={[noPhoto]} pendingReview={[]} past={[]} />,
    );

    expect(container.querySelector('img')).toBeNull();
  });

  it('formatea la hora en Europe/Madrid, no en UTC', () => {
    // 08:00 UTC en julio = 10:00 en Madrid (CEST, UTC+2).
    const summer = buildBooking({
      id: 'bkg-tz',
      startAt: new Date('2026-07-15T08:00:00.000Z'),
      endAt: new Date('2026-07-15T09:00:00.000Z'),
    });

    renderWithIntl(<BookingsList upcoming={[summer]} pendingReview={[]} past={[]} />);

    const card = screen.getByRole('article');
    expect(card.textContent).toContain('10:00');
    expect(card.textContent).not.toContain('08:00');
  });

  it('muestra el CTA Valorar en la sección de valoraciones pendientes', () => {
    const reviewable = buildBooking({
      id: 'bkg-rev',
      status: 'completed',
      startAt: inHours(-24),
    });

    renderWithIntl(<BookingsList upcoming={[]} pendingReview={[reviewable]} past={[]} />);

    expect(screen.getByRole('button', { name: /Valorar/ })).toBeInTheDocument();
  });

  it('muestra el badge "Reembolsada" y lo deja en el historial', () => {
    const refunded = buildBooking({
      id: 'bkg-refunded',
      status: 'refunded',
      startAt: inHours(-96),
    });
    const { past, upcoming, pendingReview } = splitBookings([refunded], NOW);

    renderWithIntl(<BookingsList upcoming={upcoming} pendingReview={pendingReview} past={past} />);

    const pastSection = screen.getByRole('region', { name: 'Historial' });
    expect(within(pastSection).getAllByRole('article')).toHaveLength(1);
    expect(within(pastSection).getByText('Reembolsada')).toBeInTheDocument();
  });
});

describe('splitBookings', () => {
  it('manda las completadas sin review a valoraciones pendientes y las reseñadas al historial', () => {
    const sinReview = buildBooking({
      id: 'bkg-sin',
      status: 'completed',
      hasReview: false,
      startAt: inHours(-24),
    });
    const conReview = buildBooking({
      id: 'bkg-con',
      status: 'completed',
      hasReview: true,
      startAt: inHours(-48),
    });

    const { upcoming, past, pendingReview } = splitBookings([sinReview, conReview], NOW);

    expect(upcoming).toHaveLength(0);
    expect(pendingReview.map((b) => b.id)).toEqual(['bkg-sin']);
    expect(past.map((b) => b.id)).toEqual(['bkg-con']);
  });

  it('devuelve los tres grupos vacíos si no hay reservas', () => {
    expect(splitBookings([], NOW)).toEqual({ upcoming: [], past: [], pendingReview: [] });
  });
});
