/**
 * Tests de los correos del pago en el local y del «no presentado»
 * (§4.bis, decidido 2026-10-29): qué se cuenta según el modo de pago,
 * la sanción y el bloqueo, la clave `no-show/<id>` y que nunca lanza.
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

import {
  buildBookingConfirmedEmail,
  buildProviderNewBookingEmail,
} from './notifications.booking-templates';
import { buildClientCancellationEmail } from './notifications.client-cancellation-templates';
import { buildBookingReminderEmail } from './notifications.followup-templates';
import { notifyBookingNoShow, notifyNoShowUndone } from './notifications.no-show';
import { buildNoShowEmail, buildNoShowUndoneEmail } from './notifications.no-show-templates';

function ctx(overrides: Partial<BookingEmailContext> = {}): BookingEmailContext {
  return {
    bookingId: 'bk-1',
    status: 'confirmed',
    startAt: new Date('2026-11-10T17:30:00.000Z'),
    createdAt: new Date('2026-11-01T10:00:00.000Z'),
    priceCents: 3000,
    originalPriceCents: null,
    discountPct: null,
    notes: null,
    stripeRefundId: null,
    paymentMode: 'onsite',
    commissionCents: 360,
    noShowAt: null,
    serviceName: { es: 'Corte de pelo', ca: 'Tall de cabell', en: 'Haircut', de: 'Haarschnitt' },
    professionalName: 'Marta',
    provider: { id: 'prov-1', name: 'Studio Aura', slug: 'studio-aura', address: 'Carrer Major 1' },
    client: { email: 'ana@yaiwell.com', locale: 'es', fullName: 'Ana' },
    owner: { email: 'centro@yaiwell.com', locale: 'es', fullName: null },
    ...overrides,
  };
}

const NO_SANCTION = { sanctionApplied: false, sanctionsInWindow: 0, restrictedUntil: null };

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
  mocks.sendEmail.mockResolvedValue(undefined);
});

describe('confirmación de una reserva en el local', () => {
  it('al cliente le dice cuánto pagará en el local y avisa del no presentado', () => {
    const email = buildBookingConfirmedEmail(ctx());
    const text = email.paragraphs.join(' ');

    expect(text).toMatch(/Pagarás 30,00\s€ en el local/);
    expect(text).toContain('sumarás 1 ausencia');
    expect(text).not.toContain('Hemos recibido el pago');
    expect(email.details.map((d) => d.label)).toContain('A pagar en el local');
  });

  it('al negocio le cuenta lo que cobra y la comisión de su factura mensual', () => {
    const email = buildProviderNewBookingEmail(ctx());
    const text = email.paragraphs.join(' ');

    expect(text).toContain('pagará en tu local');
    expect(text).toMatch(/Cobra 30,00\s€.*comisión de Yaiwell \(3,60\s€\).*factura mensual/);
  });

  it('online no cambia: recibo del pago, sin avisos del local', () => {
    const email = buildBookingConfirmedEmail(ctx({ paymentMode: 'online' }));

    expect(email.paragraphs.join(' ')).toContain('Hemos recibido el pago');
    expect(email.details.map((d) => d.label)).toContain('Total pagado');
  });
});

describe('recordatorio y cancelación en el local', () => {
  it('el recordatorio añade la línea del pago en el local', () => {
    const local = buildBookingReminderEmail(ctx());
    const online = buildBookingReminderEmail(ctx({ paymentMode: 'online' }));

    expect(local.paragraphs.join(' ')).toMatch(/pagas 30,00\s€ en el local/);
    expect(online.paragraphs).toHaveLength(1);
  });

  it('la cancelación del cliente sin cobro dice «sin cargo»', () => {
    const email = buildClientCancellationEmail(ctx({ status: 'cancelled' }), 'no_payment');

    expect(email.paragraphs.join(' ')).toContain('sin cargo');
    expect(email.paragraphs.join(' ')).not.toContain('no hay nada que devolver');
  });
});

describe('aviso de no presentado', () => {
  it('online: sin devolución ni sanción', () => {
    const email = buildNoShowEmail(ctx({ paymentMode: 'online', status: 'no_show' }), NO_SANCTION);
    const text = email.paragraphs.join(' ');

    expect(text).toMatch(/no hay devolución del importe \(30,00\s€\)/);
    expect(text).not.toContain('sanción');
  });

  it('en el local: 1 sanción con el «n de 3», sin bloqueo todavía', () => {
    const email = buildNoShowEmail(ctx({ status: 'no_show' }), {
      sanctionApplied: true,
      sanctionsInWindow: 2,
      restrictedUntil: null,
    });
    const text = email.paragraphs.join(' ');

    expect(text).toContain('llevas 2 de 3');
    expect(text).not.toContain('solo podrás reservar pagando online');
  });

  it('en el local con la tercera: hasta cuándo solo online (dd/mm en Madrid)', () => {
    const email = buildNoShowEmail(ctx({ status: 'no_show' }), {
      sanctionApplied: true,
      sanctionsInWindow: 3,
      // 23:30 UTC del 9 de febrero = 00:30 del 10 en Madrid.
      restrictedUntil: new Date('2027-02-09T23:30:00.000Z'),
    });

    expect(email.paragraphs.join(' ')).toContain(
      'hasta el 10/02 solo podrás reservar pagando online',
    );
  });

  it('ofrece soporte por email y sale en el idioma del cliente', () => {
    const email = buildNoShowEmail(
      ctx({ status: 'no_show', client: { email: 'a@yaiwell.com', locale: 'de', fullName: null } }),
      NO_SANCTION,
    );

    expect(email.cta?.url).toBe('mailto:hola@yaiwell.com');
    expect(email.outro?.join(' ')).toContain('hola@yaiwell.com');
    expect(email.heading).toBe('Du hast deinen Termin nicht wahrgenommen');
  });

  it('notifyBookingNoShow usa la clave no-show/<id>-<noShowAt>: volver a marcar sí avisa', async () => {
    const first = new Date('2026-11-10T19:00:00.000Z');
    const second = new Date('2026-11-11T09:00:00.000Z');
    mocks.findBookingContext.mockResolvedValueOnce(ctx({ status: 'no_show', noShowAt: first }));
    mocks.findBookingContext.mockResolvedValueOnce(ctx({ status: 'no_show', noShowAt: second }));

    await notifyBookingNoShow('bk-1', NO_SANCTION);
    await notifyBookingNoShow('bk-1', NO_SANCTION);

    const keys = mocks.sendEmail.mock.calls.map(([message]) => message.idempotencyKey);
    expect(keys).toEqual([`no-show/bk-1-${first.getTime()}`, `no-show/bk-1-${second.getTime()}`]);
  });

  it('si el negocio ya lo deshizo, no envía nada', async () => {
    mocks.findBookingContext.mockResolvedValue(ctx({ status: 'confirmed' }));

    await notifyBookingNoShow('bk-1', NO_SANCTION);

    expect(mocks.sendEmail).not.toHaveBeenCalled();
  });

  it('nunca lanza aunque falle la lectura', async () => {
    mocks.findBookingContext.mockRejectedValue(new Error('db down'));

    await expect(notifyBookingNoShow('bk-1', NO_SANCTION)).resolves.toBeUndefined();
  });
});

describe('aviso de «no presentado» retirado', () => {
  it('con sanción retirada lo dice expresamente', () => {
    const email = buildNoShowUndoneEmail(ctx(), true);
    const text = email.paragraphs.join(' ');

    expect(email.heading).toBe('Ausencia retirada');
    expect(text).toContain('ya no consta como «no presentado»');
    expect(text).toContain('Hemos retirado la sanción');
  });

  it('online (sin sanción) solo corrige el aviso', () => {
    const email = buildNoShowUndoneEmail(ctx({ paymentMode: 'online' }), false);
    expect(email.paragraphs.join(' ')).not.toContain('sanción');
  });

  it('notifyNoShowUndone sale si la reserva ya no está no_show, con clave por deshacer', async () => {
    const undoneAt = new Date('2026-11-11T10:00:00.000Z');
    mocks.findBookingContext.mockResolvedValue(ctx({ status: 'confirmed' }));

    await notifyNoShowUndone('bk-1', true, undoneAt);

    expect(mocks.sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({ idempotencyKey: `no-show-undone/bk-1-${undoneAt.getTime()}` }),
    );
  });

  it('si se volvió a marcar entre medias, no envía la corrección', async () => {
    mocks.findBookingContext.mockResolvedValue(ctx({ status: 'no_show' }));
    await notifyNoShowUndone('bk-1', true, new Date());
    expect(mocks.sendEmail).not.toHaveBeenCalled();
  });
});
