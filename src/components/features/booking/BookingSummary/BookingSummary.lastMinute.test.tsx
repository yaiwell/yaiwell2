import { render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { describe, expect, it } from 'vitest';

import messages from '@/messages/es.json';
import type { Provider, Service } from '@/types/domain';

import { BookingSummary } from './BookingSummary';
import { formatCancellationDeadline, formatSlotDateLong } from './BookingSummary.logic';

/**
 * Tests de la política de cancelación del resumen, que depende del
 * hueco elegido y aparece una sola vez:
 *  - Con margen (≥ 2 h): «Cancelación gratuita hasta el {startAt − 2 h}…».
 *  - De última hora (< 2 h): se paga ahora, sin cancelación ni reembolso.
 *
 * Usamos los mensajes reales de `es.json` para que el test falle si el
 * copy pierde una clave.
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

const SLOT_START = '2026-10-05T16:00:00.000Z';
const SLOT_END = '2026-10-05T17:00:00.000Z';

function renderSummary(isLastMinute: boolean) {
  return render(
    <NextIntlClientProvider locale="es" messages={messages} timeZone="Europe/Madrid">
      <BookingSummary
        provider={provider}
        service={service}
        locale="es"
        slotStartIso={SLOT_START}
        slotEndIso={SLOT_END}
        notes=""
        price={{
          amountCents: 4500,
          originalPriceCents: null,
          discountPct: null,
          isEstimate: true,
        }}
        isLastMinute={isLastMinute}
        onNotesChange={() => {}}
      />
    </NextIntlClientProvider>,
  );
}

describe('BookingSummary — política de cancelación', () => {
  it('con un hueco de última hora muestra el aviso y no promete cancelar gratis', () => {
    renderSummary(true);

    const notice = screen.getByRole('status');
    expect(notice).toHaveTextContent('Esta reserva empieza en menos de 2 h');
    expect(notice).toHaveTextContent('no admite cancelación ni reembolso');
    expect(screen.queryByText(/Cancelación gratuita/u)).not.toBeInTheDocument();
  });

  it('con un hueco lejano no muestra el aviso y da la hora exacta límite', () => {
    renderSummary(false);

    expect(screen.queryByText(/menos de 2 h/u)).not.toBeInTheDocument();
    const deadline = formatCancellationDeadline(SLOT_START, 'es');
    expect(
      screen.getByText(`Cancelación gratuita hasta el ${deadline}: escríbenos y la tramitamos.`),
    ).toBeInTheDocument();
    // La política aparece una sola vez.
    expect(screen.getAllByText(/Cancelación gratuita/u)).toHaveLength(1);
  });

  it('calcula el límite como inicio − 2 h', () => {
    expect(formatCancellationDeadline(SLOT_START, 'es')).toBe(
      formatSlotDateLong('2026-10-05T14:00:00.000Z', 'es'),
    );
  });
});
