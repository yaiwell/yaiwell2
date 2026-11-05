/**
 * Tests de los avisos del reembolso por incidencia del centro: qué correo
 * recibe el cliente según el estado anterior, que el centro siempre se entere,
 * las claves por reserva, que nunca se ofrezca liberar con descuento y que el
 * dinero no se dé por devuelto si Stripe falló.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

import frEmails from '@/messages/emails/fr.json';

import { renderEmailText } from './notifications.layout';
import type { BookingEmailContext } from './notifications.types';

const mocks = vi.hoisted(() => ({ sendEmail: vi.fn(), findBookingContext: vi.fn() }));

vi.mock('server-only', () => ({}));
vi.mock('@/lib/integrations/email', () => {
  class EmailConfigError extends Error {}
  class EmailSendError extends Error {}
  return { sendEmail: mocks.sendEmail, EmailConfigError, EmailSendError };
});
vi.mock('./notifications.repository', () => ({
  notificationsRepository: { findBookingContext: mocks.findBookingContext },
}));

import { notifyCentreIncidentRefund } from './notifications.incident-refund';
import {
  buildPastIncidentRefundEmail,
  buildProviderIncidentRefundEmail,
} from './notifications.incident-refund-templates';

const NOW = new Date('2026-11-10T10:00:00.000Z');

function ctx(overrides: Partial<BookingEmailContext> = {}): BookingEmailContext {
  return {
    bookingId: 'bk-1',
    status: 'cancelled',
    startAt: new Date('2026-11-10T11:00:00.000Z'),
    createdAt: new Date('2026-11-01T10:00:00.000Z'),
    priceCents: 3000,
    originalPriceCents: null,
    discountPct: null,
    notes: null,
    stripeRefundId: null,
    paymentMode: 'online',
    commissionCents: 360,
    noShowAt: null,
    serviceName: { es: 'Corte', ca: 'Tall', en: 'Haircut', de: 'Haarschnitt' },
    professionalName: 'Marta',
    provider: { id: 'p-1', name: 'Studio Aura', slug: 'studio-aura', address: 'Calle Mayor 1' },
    client: { email: 'cliente@yaiwell.com', locale: 'es', fullName: 'Ana' },
    owner: { email: 'centro@yaiwell.com', locale: 'es', fullName: 'Marta' },
    ...overrides,
  };
}

/** Correos enviados, por clave de idempotencia. */
function sentByKey() {
  return new Map(
    mocks.sendEmail.mock.calls.map(([message]) => [message.idempotencyKey as string, message]),
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.sendEmail.mockResolvedValue(undefined);
  mocks.findBookingContext.mockResolvedValue(ctx());
});

const NOTICE = { refund: 'refunded', previousStatus: 'confirmed', slot: 'blocked' } as const;

describe('notifyCentreIncidentRefund', () => {
  it('con la cita por venir, el cliente recibe la cancelación del centro con su clave', async () => {
    await notifyCentreIncidentRefund('bk-1', NOTICE, NOW);

    const sent = sentByKey();
    expect([...sent.keys()].sort()).toEqual([
      'booking-cancelled/bk-1',
      'incident-refund-provider/bk-1',
    ]);
    expect(sent.get('booking-cancelled/bk-1')?.subject).toBe('Studio Aura ha cancelado tu reserva');
    expect(sent.get('booking-cancelled/bk-1')?.to).toEqual(['cliente@yaiwell.com']);
    expect(sent.get('incident-refund-provider/bk-1')?.to).toEqual(['centro@yaiwell.com']);
  });

  it('con la reserva finalizada, el cliente recibe su propio aviso', async () => {
    await notifyCentreIncidentRefund('bk-1', { ...NOTICE, previousStatus: 'completed' }, NOW);

    expect([...sentByKey().keys()].sort()).toEqual([
      'incident-refund-client/bk-1',
      'incident-refund-provider/bk-1',
    ]);
  });

  it('una confirmed con la cita ya empezada también usa el aviso de cita pasada', async () => {
    mocks.findBookingContext.mockResolvedValue(ctx({ startAt: NOW }));

    await notifyCentreIncidentRefund('bk-1', { ...NOTICE, slot: 'not_applicable' }, NOW);

    expect([...sentByKey().keys()].sort()).toEqual([
      'incident-refund-client/bk-1',
      'incident-refund-provider/bk-1',
    ]);
  });

  it('el «en trámite» y la devolución hecha no comparten clave', async () => {
    await notifyCentreIncidentRefund('bk-1', { ...NOTICE, refund: 'refund_pending' }, NOW);

    expect([...sentByKey().keys()].sort()).toEqual([
      'booking-cancelled-pending/bk-1',
      'incident-refund-provider-pending/bk-1',
    ]);
  });

  it('sale aunque el webhook ya la haya pasado a refunded', async () => {
    mocks.findBookingContext.mockResolvedValue(ctx({ status: 'refunded' }));

    await notifyCentreIncidentRefund('bk-1', NOTICE, NOW);

    expect(mocks.sendEmail).toHaveBeenCalledTimes(2);
  });

  it('no avisa si la reserva no está muerta', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    mocks.findBookingContext.mockResolvedValue(ctx({ status: 'confirmed' }));

    await notifyCentreIncidentRefund('bk-1', NOTICE, NOW);

    expect(mocks.sendEmail).not.toHaveBeenCalled();
  });

  it('un fallo de lectura no se propaga', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    mocks.findBookingContext.mockRejectedValue(new Error('db down'));

    await expect(notifyCentreIncidentRefund('bk-1', NOTICE, NOW)).resolves.toBe(undefined);
  });
});

describe('plantillas', () => {
  it('el cliente de una cita pasada no lee que ya se devolvió si Stripe falló', () => {
    const issued = renderEmailText(buildPastIncidentRefundEmail(ctx(), 'refunded'));
    const pending = renderEmailText(buildPastIncidentRefundEmail(ctx(), 'refund_pending'));

    expect(issued).toContain('Según tu banco');
    expect(pending).toContain('Estamos tramitando');
    expect(pending).not.toContain('Según tu banco');
  });

  it('el centro no recibe el email del cliente ni la oferta de liberar con descuento', () => {
    const content = buildProviderIncidentRefundEmail(ctx(), 'refunded', 'blocked');

    expect(renderEmailText(content)).not.toContain('cliente@yaiwell.com');
    expect(renderEmailText(content)).not.toMatch(/descuento/i);
    expect(content.cta?.url).toContain('/panel/calendario');
    expect(content.cta?.url).not.toContain('liberar');
  });

  it('al centro le cuenta su parte neta, no el importe íntegro', () => {
    const text = renderEmailText(buildProviderIncidentRefundEmail(ctx(), 'refunded', 'blocked'));

    // 30,00 de precio menos 3,60 de comisión.
    expect(text).toMatch(/26,40/);
  });

  it('si Stripe falló, al centro le cuenta que está en trámite', () => {
    const content = buildProviderIncidentRefundEmail(ctx(), 'refund_pending', 'blocked');
    const text = renderEmailText(content);

    expect(content.subject).toContain('en trámite');
    expect(content.heading).toBe('Estamos reembolsando una reserva');
    expect(text).toContain('Aún no se ha completado');
    expect(text).toContain('Cuando se complete');
    expect(text).toMatch(/26,40/);
  });

  it('dice la verdad sobre la franja', () => {
    const textFor = (slot: 'blocked' | 'not_blocked' | 'taken' | 'not_applicable') =>
      renderEmailText(buildProviderIncidentRefundEmail(ctx(), 'refunded', slot));

    expect(textFor('blocked')).toContain('Hemos bloqueado esa franja');
    expect(textFor('blocked')).toContain('desbloquearla');
    expect(textFor('not_blocked')).toContain('bloquéala');
    expect(textFor('not_blocked')).not.toContain('Hemos bloqueado');
    expect(textFor('not_applicable')).not.toMatch(/franja/);
    expect(textFor('taken')).toContain('ya tiene otra reserva');
    expect(textFor('taken')).not.toContain('bloquéala');
    expect(textFor('taken')).not.toContain('vuelve a estar libre');
  });

  it.each([
    ['ca', 'Hem reemborsat una reserva', 'Estem reemborsant una reserva'],
    ['en', 'We have refunded a booking', 'We are refunding a booking'],
    ['de', 'Wir haben eine Buchung erstattet', 'Wir erstatten gerade eine Buchung'],
    ['fr', 'Nous avons remboursé une réservation', 'Nous remboursons une réservation'],
  ] as const)('el aviso al centro sale en %s, el idioma del dueño', (locale, issued, pending) => {
    const context = ctx({ owner: { email: 'centro@yaiwell.com', locale, fullName: 'Marta' } });
    const done = buildProviderIncidentRefundEmail(context, 'refunded', 'blocked');
    const inProgress = buildProviderIncidentRefundEmail(context, 'refund_pending', 'not_blocked');

    expect(done.heading).toBe(issued);
    expect(inProgress.heading).toBe(pending);
    // Una variable sin sustituir delataría un apóstrofo recto mal puesto.
    expect(renderEmailText(done)).not.toMatch(/\{[a-z]+\}/);
    expect(renderEmailText(inProgress)).not.toMatch(/\{[a-z]+\}/);
  });

  it('los textos nuevos en francés usan apóstrofo tipográfico', () => {
    expect(JSON.stringify(frEmails.incidentRefund)).not.toContain("'");
  });

  it('el aviso de cita pasada sustituye el negocio también en el encabezado', () => {
    const content = buildPastIncidentRefundEmail(
      ctx({ client: { email: 'cliente@yaiwell.com', locale: 'de', fullName: 'Ana' } }),
      'refunded',
    );

    expect(content.heading).toBe('Wir erstatten dir die Zahlung für deine Buchung bei Studio Aura');
  });
});
