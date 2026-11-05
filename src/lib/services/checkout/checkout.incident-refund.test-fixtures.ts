/**
 * Datos de prueba compartidos por los tests del reembolso por incidencia.
 */
import type { IncidentRefundRow } from './checkout.incident-refund.repository';

export const BOOKING_ID = '9a1f7c2d-3b4e-4f5a-8b9c-0d1e2f3a4b5c';
export const ADMIN_ID = 'admin-user-1';
export const NOTE = 'El centro ha sufrido una avería eléctrica';
export const NOW = new Date('2026-11-05T10:00:00.000Z');
export const FAILED_AT = new Date('2026-11-04T10:00:00.000Z');

/** Reserva online confirmada a una hora vista: lo normal, a menos de 2 h. */
export function incidentRow(overrides: Partial<IncidentRefundRow> = {}): IncidentRefundRow {
  return {
    id: BOOKING_ID,
    status: 'confirmed',
    paymentMode: 'online',
    priceCents: 4500,
    startAt: new Date('2026-11-05T11:00:00.000Z'),
    endAt: new Date('2026-11-05T12:00:00.000Z'),
    completedAt: null,
    providerId: 'prov-1',
    professionalId: 'pro-1',
    slotOfferId: null,
    stripePaymentIntentId: 'pi_123',
    stripeRefundId: null,
    refundedAt: null,
    refundFailedAt: null,
    refundDismissedAt: null,
    incidentRefundAt: null,
    incidentRefundBy: null,
    incidentRefundNote: null,
    provider: { businessName: 'Estudio Sal' },
    service: { name: { es: 'Corte' } },
    ...overrides,
  };
}

/** Reserva ya cancelada por incidencia, sin refund ni fallo registrados. */
export function unfinishedRow(overrides: Partial<IncidentRefundRow> = {}): IncidentRefundRow {
  return incidentRow({
    status: 'cancelled',
    incidentRefundAt: new Date(NOW.getTime() - 10 * 60_000),
    incidentRefundBy: 'admin-original',
    incidentRefundNote: NOTE,
    ...overrides,
  });
}

/** PaymentIntent cobrado con su cargo intacto, tal como lo expande Stripe. */
export function paidIntent(charge: Record<string, unknown> = {}) {
  return {
    id: 'pi_123',
    status: 'succeeded',
    latest_charge: {
      object: 'charge',
      amount: 4500,
      amount_refunded: 0,
      refunded: false,
      disputed: false,
      ...charge,
    },
  };
}
