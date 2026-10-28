import { render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { describe, expect, it } from 'vitest';

import messages from '@/messages/es.json';
import type { Provider, Service } from '@/types/domain';

import type { DisplayedBookingPrice } from '../DiscountedPrice';

import { BookingSummary } from './BookingSummary';

/**
 * Tests del importe del resumen con hueco liberado con descuento:
 * precio de referencia tachado, rótulo de «precio previsto» antes de la
 * reserva y aviso de última hora intacto.
 */

const provider = {
  id: 'prov-1',
  name: 'Estudi Serena',
  photos: [],
  address: 'Carrer de Prova, 1',
} as unknown as Provider;

const service = {
  id: 'svc-1',
  name: { es: 'Corte y peinado', ca: 'Tall i pentinat' },
  durationMinutes: 60,
  priceCents: 4500,
} as unknown as Service;

const DISCOUNTED: DisplayedBookingPrice = {
  amountCents: 3600,
  originalPriceCents: 4500,
  discountPct: 20,
  isEstimate: true,
};

function renderSummary(price: DisplayedBookingPrice, isLastMinute = false) {
  return render(
    <NextIntlClientProvider locale="es" messages={messages} timeZone="Europe/Madrid">
      <BookingSummary
        provider={provider}
        service={service}
        locale="es"
        slotStartIso="2026-10-05T16:00:00.000Z"
        slotEndIso="2026-10-05T17:00:00.000Z"
        notes=""
        price={price}
        isLastMinute={isLastMinute}
        onNotesChange={() => {}}
      />
    </NextIntlClientProvider>,
  );
}

const q = (component: string) => document.querySelector(`[data-component="${component}"]`);

describe('BookingSummary — hueco con descuento', () => {
  it('tacha el precio de referencia y enseña el rebajado con su %', () => {
    renderSummary(DISCOUNTED);

    expect(q('booking-summary-total-original')?.tagName).toBe('DEL');
    expect(q('booking-summary-total-original')).toHaveTextContent(/45\s€/u);
    expect(q('booking-summary-total-pct')).toHaveTextContent('−20 %');
    expect(
      screen.getByText(/Precio habitual 45\s€; con un 20 % de descuento, 36\s€/u),
    ).toBeInTheDocument();
  });

  it('antes de reservar lo rotula como precio previsto', () => {
    renderSummary(DISCOUNTED);

    expect(screen.getByText('Precio previsto')).toBeInTheDocument();
    expect(q('booking-summary-estimate-hint')).toHaveTextContent(
      'El importe final se confirma al pasar al pago.',
    );
  });

  it('con importe del servidor vuelve a «Total» y quita la aclaración', () => {
    renderSummary({ ...DISCOUNTED, isEstimate: false });

    expect(screen.getByText('Total')).toBeInTheDocument();
    expect(q('booking-summary-estimate-hint')).toBeNull();
    expect(q('booking-summary-total-original')).not.toBeNull();
  });

  it('sin descuento no pinta tachado', () => {
    renderSummary({
      ...DISCOUNTED,
      amountCents: 4500,
      originalPriceCents: null,
      discountPct: null,
    });

    expect(q('booking-summary-total-original')).toBeNull();
    expect(screen.getByText('Total')).toBeInTheDocument();
  });

  it('el aviso de última hora se sigue viendo igual con descuento', () => {
    renderSummary(DISCOUNTED, true);

    const notice = screen.getByRole('status');
    expect(notice).toHaveTextContent('Esta reserva empieza en menos de 2 h');
    expect(notice).toHaveTextContent('no admite cancelación ni reembolso');
  });
});
