/**
 * Tests de las plantillas de correo: idioma del destinatario, hora de
 * Madrid, descuento, escapado y paridad de claves en los 4 idiomas.
 */
import { describe, expect, it } from 'vitest';

import ca from '@/messages/emails/ca.json';
import de from '@/messages/emails/de.json';
import en from '@/messages/emails/en.json';
import es from '@/messages/emails/es.json';

import {
  buildBookingCancelledEmail,
  buildBookingConfirmedEmail,
  buildLatePaymentRefundedEmail,
  buildProviderNewBookingEmail,
  buildReviewInviteEmail,
} from './notifications.booking-templates';
import {
  buildBookingReminderEmail,
  buildRefundCompletedEmail,
  buildRefundDelayedEmail,
} from './notifications.followup-templates';
import { renderEmailHtml, renderEmailText } from './notifications.layout';
import type { BookingEmailContext } from './notifications.types';
import {
  buildProviderApprovedEmail,
  buildProviderRejectedEmail,
} from './notifications.verification-templates';

function ctx(overrides: Partial<BookingEmailContext> = {}): BookingEmailContext {
  return {
    bookingId: 'bk-1',
    status: 'confirmed',
    // 17:30 UTC en invierno = 18:30 en Madrid.
    startAt: new Date('2026-11-10T17:30:00.000Z'),
    createdAt: new Date('2026-11-01T10:00:00.000Z'),
    priceCents: 3000,
    originalPriceCents: null,
    discountPct: null,
    notes: null,
    serviceName: { es: 'Corte de pelo', ca: 'Tall de cabell', en: 'Haircut', de: 'Haarschnitt' },
    professionalName: 'Marta',
    provider: { id: 'prov-1', name: 'Studio Aura', slug: 'studio-aura', address: 'Carrer Major 1' },
    client: { email: 'cliente@yaiwell.com', locale: 'es', fullName: 'Ana' },
    owner: { email: 'centro@yaiwell.com', locale: 'de', fullName: null },
    ...overrides,
  };
}

/** Rutas de todas las hojas de un objeto de mensajes. */
function leafKeys(obj: object, prefix = ''): string[] {
  return Object.entries(obj).flatMap(([k, v]) =>
    typeof v === 'object' && v !== null ? leafKeys(v, `${prefix}${k}.`) : [`${prefix}${k}`],
  );
}

describe('plantillas de reserva', () => {
  it('el recibo sale en el idioma del cliente y con la hora de Madrid', () => {
    const content = buildBookingConfirmedEmail(ctx());
    expect(content.subject).toBe('Reserva confirmada en Studio Aura');
    expect(content.greeting).toBe('Hola, Ana:');
    const when = content.details.find((d) => d.label === 'Cuándo')?.value;
    expect(when).toContain('18:30');
    expect(content.cta?.url).toMatch(/\/es\/mis-reservas$/);
  });

  it('el recibo de una reserva de última hora avisa de que no hay devolución', () => {
    const lastMinute = ctx({ createdAt: new Date('2026-11-10T16:00:00.000Z') });
    expect(buildBookingConfirmedEmail(lastMinute).paragraphs[1]).toContain('no admite devolución');
    expect(buildBookingConfirmedEmail(ctx()).paragraphs).toHaveLength(1);
  });

  it('el reembolso completado da el importe y enlaza al centro', () => {
    const content = buildRefundCompletedEmail(ctx());
    expect(content.subject).toBe('Te hemos devuelto el pago de tu reserva en Studio Aura');
    expect(content.paragraphs[0]).toMatch(/30,00/);
    expect(content.cta?.url).toMatch(/\/es\/centro\/studio-aura-prov-1$/);
  });

  it('el reembolso retrasado no promete plazo y no lleva botón', () => {
    const content = buildRefundDelayedEmail(ctx());
    expect(content.paragraphs[0]).toMatch(/30,00/);
    expect(content.paragraphs.join(' ')).not.toMatch(/días/);
    expect(content.cta).toBeUndefined();
  });

  it('el recordatorio sale en el idioma del cliente con la cita completa', () => {
    const content = buildBookingReminderEmail(ctx({ client: { ...ctx().client, locale: 'en' } }));
    expect(content.subject).toBe('Your appointment at Studio Aura is tomorrow');
    expect(content.details.find((d) => d.label === 'Professional')?.value).toBe('Marta');
  });

  it('el aviso al centro sale en el idioma del dueño, con cliente y notas', () => {
    const content = buildProviderNewBookingEmail(ctx({ notes: 'Pelo largo' }));
    expect(content.heading).toBe('Du hast eine neue Buchung');
    expect(content.greeting).toBe('Hallo,');
    expect(content.details).toEqual(
      expect.arrayContaining([
        { label: 'Leistung', value: 'Haarschnitt' },
        { label: 'Kundschaft', value: 'Ana' },
        { label: 'Anmerkungen', value: 'Pelo largo' },
      ]),
    );
    expect(renderEmailText(content)).not.toContain('cliente@yaiwell.com');
  });

  it('muestra el descuento con el precio habitual', () => {
    const content = buildBookingConfirmedEmail(
      ctx({ priceCents: 2400, originalPriceCents: 3000, discountPct: 20 }),
    );
    const paid = content.details.find((d) => d.label === 'Total pagado')?.value ?? '';
    expect(paid).toMatch(/24,00/);
    expect(paid).toContain('Descuento del 20 %');
    expect(paid).toMatch(/30,00/);
  });

  it('la cancelación cuenta el reembolso según su estado', () => {
    expect(buildBookingCancelledEmail(ctx(), 'refunded').paragraphs[1]).toContain('5 a 10 días');
    expect(buildBookingCancelledEmail(ctx(), 'refund_pending').paragraphs[1]).toContain(
      'tramitando',
    );
    expect(buildBookingCancelledEmail(ctx(), 'no_payment').paragraphs).toHaveLength(1);
    // Sin saber si hubo cobro, el texto es condicional.
    expect(buildBookingCancelledEmail(ctx(), 'refund_uncertain').paragraphs[1]).toContain(
      'Si llegaste a pagar',
    );
    expect(buildBookingCancelledEmail(ctx(), 'refunded').cta?.url).toMatch(
      /\/es\/centro\/studio-aura-prov-1$/,
    );
  });

  it('el pago tardío explica por qué no hay cita y el reembolso', () => {
    const content = buildLatePaymentRefundedEmail(ctx(), 'refunded');
    expect(content.subject).toBe('No hemos podido confirmar tu reserva en Studio Aura');
    expect(content.paragraphs[1]).toContain('100 %');
    expect(content.details).toHaveLength(3);
  });

  it('la invitación a valorar recuerda la ventana de 30 días', () => {
    const content = buildReviewInviteEmail(ctx({ client: { ...ctx().client, locale: 'ca' } }));
    expect(content.subject).toBe('Com ha anat a Studio Aura?');
    expect(content.paragraphs.join(' ')).toContain('30 dies');
  });
});

describe('plantillas de verificación', () => {
  const provider = {
    providerId: 'prov-1',
    name: 'Studio Aura',
    owner: { email: 'centro@yaiwell.com', locale: 'en' as const, fullName: 'Jo' },
  };

  it('aprobado enlaza al panel', () => {
    const content = buildProviderApprovedEmail(provider);
    expect(content.subject).toBe('Studio Aura is now live on Yaiwell');
    expect(content.cta?.url).toMatch(/\/en\/panel$/);
  });

  it('rechazado incluye el motivo escapado en HTML', () => {
    const content = buildProviderRejectedEmail(provider, 'Falta el <b>CIF</b>');
    const html = renderEmailHtml(content, 'en');
    expect(html).toContain('Falta el &lt;b&gt;CIF&lt;/b&gt;');
    expect(html).not.toContain('<b>CIF</b>');
    expect(content.outro).toHaveLength(1);
  });
});

describe('mensajes de correo', () => {
  it('los 4 idiomas tienen las mismas claves', () => {
    const base = leafKeys(es).sort();
    for (const messages of [ca, en, de]) expect(leafKeys(messages).sort()).toEqual(base);
  });
});
