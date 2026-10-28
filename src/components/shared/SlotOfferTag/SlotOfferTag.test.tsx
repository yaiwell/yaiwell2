import { render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { describe, expect, it } from 'vitest';

import messages from '@/messages/es.json';

import { SlotOfferTag } from './SlotOfferTag';
import { buildSlotOfferHref, formatOfferWhen } from './SlotOfferTag.logic';

/**
 * Tests de la etiqueta «Hueco liberado · −20 % · 17:00».
 */

/** 28 oct 2026, 10:00 en Madrid (CET, UTC+1). */
const NOW = new Date('2026-10-28T09:00:00.000Z');

const OFFER = {
  serviceId: 'svc-1',
  // 17:00 en Madrid del mismo día.
  startAtIso: '2026-10-28T16:00:00.000Z',
  discountPct: 20,
};

describe('formatOfferWhen', () => {
  it('da solo la hora del centro si el hueco es hoy', () => {
    expect(formatOfferWhen(OFFER.startAtIso, 'es', NOW)).toBe('17:00');
  });

  it('añade el día de la semana si el hueco es otro día', () => {
    // 30 oct 2026 es viernes.
    expect(formatOfferWhen('2026-10-30T16:00:00.000Z', 'es', NOW)).toBe('vie 17:00');
  });

  it('usa la hora de Madrid y no la del navegador alrededor de medianoche', () => {
    // 23:30 Madrid del 28 sigue siendo «hoy» aunque en UTC sea 22:30.
    expect(formatOfferWhen('2026-10-28T22:30:00.000Z', 'es', NOW)).toBe('23:30');
  });
});

describe('buildSlotOfferHref', () => {
  it('enlaza al flujo de reserva con servicio y hueco, sin precio', () => {
    const href = buildSlotOfferHref('estudio-lumen-abc', OFFER);
    const url = new URL(href, 'https://yaiwell.test');

    expect(url.pathname).toBe('/centro/estudio-lumen-abc/reservar');
    expect(url.searchParams.get('serviceId')).toBe('svc-1');
    expect(url.searchParams.get('slot')).toBe(OFFER.startAtIso);
    expect(url.searchParams.has('price')).toBe(false);
  });
});

describe('SlotOfferTag', () => {
  it('pinta la etiqueta y enlaza a reservar ese hueco', () => {
    render(
      <NextIntlClientProvider locale="es" messages={messages}>
        <SlotOfferTag offer={OFFER} providerSlugWithId="estudio-lumen-abc" now={NOW} />
      </NextIntlClientProvider>,
    );

    const link = screen.getByRole('link', {
      name: 'Hueco liberado con un 20 % de descuento, 17:00. Reservar esta hora',
    });
    expect(link).toHaveTextContent('Hueco liberado · −20 % · 17:00');
    expect(link.getAttribute('href')).toContain('/centro/estudio-lumen-abc/reservar?');
    expect(link.getAttribute('href')).toContain('slot=2026-10-28T16%3A00%3A00.000Z');
  });
});
