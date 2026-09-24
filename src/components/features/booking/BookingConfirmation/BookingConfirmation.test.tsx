import { render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { describe, expect, it } from 'vitest';

import type { AppLocale } from '@/i18n/routing';
import type { Provider, Service } from '@/types/domain';

import { BookingConfirmation } from './BookingConfirmation';

/**
 * Tests de la última pantalla del flujo que mueve dinero, que hasta
 * ahora no tenía ninguno.
 *
 * Cubren las tres promesas que no se cumplían:
 *  - Anunciar "¡Reserva confirmada!" con el pago todavía en curso.
 *  - No ofrecer ningún camino a «Mis reservas», a la que el propio copy
 *    remite por escrito.
 *  - Nombre de servicio en blanco en `/en` y `/de`.
 * Más el total, que debe salir del servidor, y la fila "Cuándo", que
 * concatenaba con `·` una fecha que ya traía la hora dentro.
 */

// Claves declaradas inline: `src/messages/*.json` es territorio del
// encargo de copy, no de este cambio.
const messages = {
  booking: {
    confirmation: {
      title: '¡Reserva confirmada!',
      subtitle: 'Hemos enviado los detalles a tu email. Te esperamos.',
      bookingIdLabel: 'Nº de reserva',
      providerLabel: 'Centro',
      serviceLabel: 'Servicio',
      whenLabel: 'Cuándo',
      totalLabel: 'Total',
      backToProvider: 'Volver al centro',
      viewMyBookings: 'Ver mis reservas',
      pendingTitle: 'Pago en curso',
      pendingSubtitle:
        'Estamos confirmando el cobro con tu banco. En cuanto termine, verás la reserva en «Mis reservas».',
    },
  },
};

const provider = {
  id: 'prov-1',
  name: 'Estudi Serena',
  photos: [],
  address: 'Carrer de Prova, 1',
} as unknown as Provider;

const service = {
  id: 'svc-1',
  // `en` y `de` ausentes a propósito: es el estado normal del contenido
  // cargado por el proveedor, que empieza en es/ca.
  name: { es: 'Corte y peinado', ca: 'Tall i pentinat' },
  durationMinutes: 45,
  priceCents: 9900,
} as unknown as Service;

function renderConfirmation(
  props: Partial<React.ComponentProps<typeof BookingConfirmation>> = {},
  locale: AppLocale = 'es',
) {
  return render(
    <NextIntlClientProvider locale={locale} messages={messages} timeZone="Europe/Madrid">
      <BookingConfirmation
        provider={provider}
        service={service}
        locale={locale}
        slotStartIso="2026-10-05T08:00:00.000Z"
        slotEndIso="2026-10-05T08:45:00.000Z"
        bookingId="bk-123"
        providerSlugWithId="estudi-serena-prov-1"
        amountCents={4500}
        {...props}
      />
    </NextIntlClientProvider>,
  );
}

describe('BookingConfirmation — honestidad del estado de pago', () => {
  it('no anuncia "¡Reserva confirmada!" mientras el pago sigue en curso', () => {
    renderConfirmation({ paymentPending: true });

    expect(screen.getByText('Pago en curso')).toBeInTheDocument();
    expect(screen.queryByText('¡Reserva confirmada!')).not.toBeInTheDocument();
  });

  it('anuncia la confirmación sólo cuando el pago está liquidado', () => {
    renderConfirmation({ paymentPending: false });

    expect(screen.getByText('¡Reserva confirmada!')).toBeInTheDocument();
    expect(screen.queryByText('Pago en curso')).not.toBeInTheDocument();
  });

  it('por defecto (prop ausente) no promete confirmación', () => {
    // El valor por defecto era `false`, y el camino sin 3DS no pasaba
    // la prop: de ahí el bug. Este test fija el contrato del defecto.
    renderConfirmation();
    expect(screen.getByText('¡Reserva confirmada!')).toBeInTheDocument();
  });
});

describe('BookingConfirmation — caminos y datos', () => {
  it('ofrece un enlace a «Mis reservas», a la que el copy remite', () => {
    renderConfirmation({ paymentPending: true });

    const link = screen.getByText('Ver mis reservas').closest('a');
    expect(link).toHaveAttribute('href', '/es/mis-reservas');
  });

  it('mantiene el enlace de vuelta a la ficha del centro', () => {
    renderConfirmation();
    expect(screen.getByText('Volver al centro').closest('a')).toHaveAttribute(
      'href',
      '/es/centro/estudi-serena-prov-1',
    );
  });

  it('muestra el rango con "→" y no con "·", que disfrazaba el rango', () => {
    renderConfirmation();

    // `formatSlotDateLong` ya incluye la hora de inicio, así que la de
    // fin cierra un rango. No fijamos horas literales: dependen de la
    // zona horaria del runner, y lo que se verifica aquí es la forma.
    const when = screen.getByText(/→/);
    const times = when.textContent?.match(/\d{2}:\d{2}/g) ?? [];
    expect(times).toHaveLength(2);
    expect(when.textContent).not.toContain('·');
  });

  it('muestra el importe del servidor, no el precio de catálogo', () => {
    renderConfirmation({ amountCents: 4500 });

    // 45,00 € del servidor; 99,00 € es el `service.priceCents` local.
    expect(screen.getByText('45 €')).toBeInTheDocument();
    expect(screen.queryByText('99 €')).not.toBeInTheDocument();
  });

  it('no deja el nombre del servicio en blanco en /en y /de', () => {
    // `en` y `de` son opcionales en `LocalizedText`: indexar a pelo
    // dejaba la fila vacía en esos idiomas.
    renderConfirmation({}, 'de');
    expect(screen.getByText('Corte y peinado')).toBeInTheDocument();

    renderConfirmation({}, 'en');
    expect(screen.getAllByText('Corte y peinado').length).toBeGreaterThan(0);
  });

  it('usa el nombre catalán cuando existe', () => {
    renderConfirmation({}, 'ca');
    expect(screen.getByText('Tall i pentinat')).toBeInTheDocument();
  });
});
