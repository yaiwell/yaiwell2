/**
 * Tests de los avisos de cancelación por el cliente: los dos correos
 * (cliente y centro), sus claves de idempotencia, el idioma de cada
 * destinatario, el texto del dinero y que un fallo nunca se propaga.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { BookingEmailContext } from './notifications.types';

const mocks = vi.hoisted(() => ({
  sendEmail: vi.fn(),
  findBookingContext: vi.fn(),
}));

vi.mock('server-only', () => ({}));
vi.mock('@/lib/integrations/email', () => {
  class EmailConfigError extends Error {}
  class EmailSendError extends Error {
    constructor(readonly retryable: boolean) {
      super('resend failed');
    }
  }
  return { sendEmail: mocks.sendEmail, EmailConfigError, EmailSendError };
});
vi.mock('./notifications.repository', () => ({
  notificationsRepository: { findBookingContext: mocks.findBookingContext },
}));

import { notifyBookingCancelledByClient } from './notifications.client-cancellation';
import {
  buildClientCancellationEmail,
  buildProviderClientCancelledEmail,
} from './notifications.client-cancellation-templates';

function ctx(overrides: Partial<BookingEmailContext> = {}): BookingEmailContext {
  return {
    bookingId: 'bk-1',
    status: 'cancelled',
    startAt: new Date('2026-11-10T17:30:00.000Z'),
    createdAt: new Date('2026-11-01T10:00:00.000Z'),
    priceCents: 3000,
    originalPriceCents: null,
    discountPct: null,
    notes: null,
    stripeRefundId: null,
    paymentMode: 'online',
    commissionCents: 360,
    noShowAt: null,
    serviceName: { es: 'Corte de pelo', ca: 'Tall de cabell', en: 'Haircut', de: 'Haarschnitt' },
    professionalName: 'Marta',
    provider: { id: 'prov-1', name: 'Studio Aura', slug: 'studio-aura', address: 'Carrer Major 1' },
    client: { email: 'ana@yaiwell.com', locale: 'es', fullName: 'Ana' },
    owner: { email: 'centro@yaiwell.com', locale: 'de', fullName: null },
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
  mocks.sendEmail.mockResolvedValue(undefined);
  mocks.findBookingContext.mockResolvedValue(ctx());
});

describe('notifyBookingCancelledByClient', () => {
  it('avisa al cliente y al centro, cada uno con su clave por reserva', async () => {
    await notifyBookingCancelledByClient('bk-1', 'refunded', false);

    expect(mocks.sendEmail).toHaveBeenCalledTimes(2);
    const calls = mocks.sendEmail.mock.calls.map(([message]) => message);
    expect(calls).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          to: ['ana@yaiwell.com'],
          idempotencyKey: 'client-cancellation-client/bk-1',
        }),
        expect.objectContaining({
          to: ['centro@yaiwell.com'],
          idempotencyKey: 'client-cancellation-provider/bk-1',
        }),
      ]),
    );
  });

  it('no envía nada si la reserva ya no está cancelada', async () => {
    mocks.findBookingContext.mockResolvedValue(ctx({ status: 'confirmed' }));

    await notifyBookingCancelledByClient('bk-1', 'refunded');

    expect(mocks.sendEmail).not.toHaveBeenCalled();
  });

  it('nunca lanza aunque falle la lectura', async () => {
    mocks.findBookingContext.mockRejectedValue(new Error('db down'));

    await expect(notifyBookingCancelledByClient('bk-1', 'refunded')).resolves.toBeUndefined();
  });
});

describe('plantillas de cancelación por el cliente', () => {
  it('confirma la cancelación con el reembolso emitido y su importe', () => {
    const email = buildClientCancellationEmail(ctx(), 'refunded');

    expect(email.subject).toBe('Has cancelado tu reserva en Studio Aura');
    expect(email.paragraphs.join(' ')).toMatch(/100 %.*30,00\s€.*5 a 10 días/);
  });

  it('con el reembolso en trámite no promete plazos', () => {
    const email = buildClientCancellationEmail(ctx(), 'refund_pending');

    expect(email.paragraphs.join(' ')).toContain('Estamos tramitando la devolución');
    expect(email.paragraphs.join(' ')).not.toContain('5 a 10 días');
  });

  it('sin cobro dice que no hay nada que devolver', () => {
    const email = buildClientCancellationEmail(ctx(), 'no_payment');

    expect(email.paragraphs.join(' ')).toContain('no hay nada que devolver');
  });

  it('el aviso al centro sale en su idioma, con el cliente y sin su email', () => {
    const email = buildProviderClientCancelledEmail(ctx(), false);
    const body = JSON.stringify(email);

    expect(email.heading).toBe('Eine Buchung wurde storniert');
    expect(email.paragraphs[0]).toContain('Ana');
    expect(body).not.toContain('ana@yaiwell.com');
  });

  it('ofrece al centro liberar la hora con descuento con un enlace directo', () => {
    const email = buildProviderClientCancelledEmail(ctx(), false);

    expect(email.cta?.label).toBe('Mit Rabatt freigeben');
    // 2026-11-10 es martes: la semana empieza el lunes 9.
    expect(email.cta?.url).toMatch(/\/de\/panel\/calendario\?semana=2026-11-09&liberar=bk-1$/);
  });

  it('si la reserva venía de una oferta activa, cuenta que vuelve a anunciarse', () => {
    const email = buildProviderClientCancelledEmail(ctx(), true);

    expect(email.paragraphs.join(' ')).toContain('Das Angebot ist weiterhin aktiv');
    expect(email.cta?.label).toBe('Kalender öffnen');
    expect(email.cta?.url).not.toContain('liberar=');
  });
});
