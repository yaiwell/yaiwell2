/**
 * Tests del service `checkout` (apertura del cobro de una reserva).
 *
 * Mockeamos Stripe, el repositorio y el resto de services para validar
 * en aislamiento las decisiones que sólo viven aquí:
 *  - No se crea reserva si el proveedor no puede cobrar (el orden de las
 *    comprobaciones es la regla, no un detalle).
 *  - El PaymentIntent lleva comisión, destino y metadata correctas.
 *  - Si Stripe falla después de crear la reserva, el slot se libera.
 *  - El profesional se resuelve en servidor, nunca llega del cliente.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

const stripeMock = vi.hoisted(() => ({
  paymentIntents: { create: vi.fn() },
}));

vi.mock('@/lib/integrations/stripe', () => ({
  getStripeClient: () => stripeMock,
}));

const availabilityRepoMock = vi.hoisted(() => ({
  findServiceForAvailability: vi.fn(),
  findFirstProfessionalIdForProvider: vi.fn(),
}));

vi.mock('@/lib/services/availability', () => ({
  availabilityRepository: availabilityRepoMock,
}));

const bookingMock = vi.hoisted(() => ({
  createBooking: vi.fn(),
  bookingRepository: { updateStatus: vi.fn() },
}));

vi.mock('@/lib/services/booking', () => ({
  createBooking: bookingMock.createBooking,
  bookingRepository: bookingMock.bookingRepository,
  ServiceNotFoundError: class ServiceNotFoundError extends Error {
    readonly code = 'SERVICE_NOT_FOUND';
  },
}));

const paymentsMock = vi.hoisted(() => ({ getConnectAccountStatus: vi.fn() }));

vi.mock('@/lib/services/payments', () => ({
  getConnectAccountStatus: paymentsMock.getConnectAccountStatus,
}));

const repoMock = vi.hoisted(() => ({
  findPayoutAccount: vi.fn(),
  attachPaymentIntent: vi.fn(),
  findByPaymentIntentId: vi.fn(),
}));

vi.mock('./checkout.repository', () => ({ checkoutRepository: repoMock }));

import {
  PaymentIntentCreationError,
  ProfessionalNotResolvedError,
  ProviderNotChargeableError,
} from './checkout.errors';
import { createBookingCheckout } from './checkout.service';

const SERVICE_ID = '3f2b8c1e-1111-4a2b-9c3d-1a2b3c4d5e6f';
const PROVIDER_ID = '70a8dc5a-2fed-4aa4-907c-ad93a49eb879';
const PROFESSIONAL_ID = 'ab12cd34-5678-4e90-b123-456789abcdef';
const CLIENT_ID = 'c1d2e3f4-5678-4a9b-8c7d-6e5f4a3b2c1d';
const STRIPE_ACCOUNT_ID = 'acct_1Nxxxx';

/** Slot suficientemente lejano para no chocar con la regla de 2 h. */
const SLOT_START = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();

const BOOKING = {
  id: 'bk-1',
  providerId: PROVIDER_ID,
  serviceId: SERVICE_ID,
  priceCents: 4500,
  commissionCents: 360,
  startAt: new Date(SLOT_START),
  endAt: new Date(new Date(SLOT_START).getTime() + 60 * 60 * 1000),
};

function validInput(overrides: Record<string, unknown> = {}) {
  return { serviceId: SERVICE_ID, slotStartIso: SLOT_START, ...overrides };
}

beforeEach(() => {
  vi.clearAllMocks();

  availabilityRepoMock.findServiceForAvailability.mockResolvedValue({
    id: SERVICE_ID,
    providerId: PROVIDER_ID,
    professionalId: PROFESSIONAL_ID,
    durationMinutes: 60,
  });
  repoMock.findPayoutAccount.mockResolvedValue({ stripeAccountId: STRIPE_ACCOUNT_ID });
  paymentsMock.getConnectAccountStatus.mockResolvedValue({ chargesEnabled: true });
  bookingMock.createBooking.mockResolvedValue(BOOKING);
  stripeMock.paymentIntents.create.mockResolvedValue({
    id: 'pi_123',
    client_secret: 'pi_123_secret_abc',
  });
});

describe('createBookingCheckout', () => {
  it('crea la reserva y devuelve el clientSecret del PaymentIntent', async () => {
    const session = await createBookingCheckout(validInput({ notes: 'Primera vez' }), CLIENT_ID);

    expect(bookingMock.createBooking).toHaveBeenCalledWith(
      {
        serviceId: SERVICE_ID,
        professionalId: PROFESSIONAL_ID,
        slotStart: SLOT_START,
        notes: 'Primera vez',
      },
      CLIENT_ID,
    );
    expect(repoMock.attachPaymentIntent).toHaveBeenCalledWith('bk-1', 'pi_123');
    expect(session).toEqual({
      bookingId: 'bk-1',
      clientSecret: 'pi_123_secret_abc',
      amountCents: 4500,
      slotStartIso: BOOKING.startAt.toISOString(),
      slotEndIso: BOOKING.endAt.toISOString(),
    });
  });

  it('monta un destination charge con la comisión y la metadata de la reserva', async () => {
    await createBookingCheckout(validInput(), CLIENT_ID);

    const [payload, options] = stripeMock.paymentIntents.create.mock.calls[0];
    expect(payload).toMatchObject({
      amount: 4500,
      currency: 'eur',
      application_fee_amount: 360,
      transfer_data: { destination: STRIPE_ACCOUNT_ID },
      metadata: {
        bookingId: 'bk-1',
        providerId: PROVIDER_ID,
        serviceId: SERVICE_ID,
        clientId: CLIENT_ID,
      },
    });
    // La clave de idempotencia evita un segundo cargo si el cliente
    // reintenta el checkout de la misma reserva.
    expect(options).toEqual({ idempotencyKey: 'booking_checkout_bk-1' });
  });

  it('nunca deja la fee por encima del importe aunque el plan esté mal sembrado', async () => {
    bookingMock.createBooking.mockResolvedValue({ ...BOOKING, commissionCents: 99_999 });

    await createBookingCheckout(validInput(), CLIENT_ID);

    const [payload] = stripeMock.paymentIntents.create.mock.calls[0];
    expect(payload.application_fee_amount).toBe(4499);
  });

  it('resuelve el profesional del proveedor cuando el servicio no lo tiene asignado', async () => {
    availabilityRepoMock.findServiceForAvailability.mockResolvedValue({
      id: SERVICE_ID,
      providerId: PROVIDER_ID,
      professionalId: null,
      durationMinutes: 60,
    });
    availabilityRepoMock.findFirstProfessionalIdForProvider.mockResolvedValue(PROFESSIONAL_ID);

    await createBookingCheckout(validInput(), CLIENT_ID);

    expect(bookingMock.createBooking).toHaveBeenCalledWith(
      expect.objectContaining({ professionalId: PROFESSIONAL_ID }),
      CLIENT_ID,
    );
  });

  it('lanza ProfessionalNotResolvedError si el proveedor no tiene profesionales', async () => {
    availabilityRepoMock.findServiceForAvailability.mockResolvedValue({
      id: SERVICE_ID,
      providerId: PROVIDER_ID,
      professionalId: null,
      durationMinutes: 60,
    });
    availabilityRepoMock.findFirstProfessionalIdForProvider.mockResolvedValue(null);

    await expect(createBookingCheckout(validInput(), CLIENT_ID)).rejects.toBeInstanceOf(
      ProfessionalNotResolvedError,
    );
    expect(bookingMock.createBooking).not.toHaveBeenCalled();
  });

  it('no crea la reserva si el proveedor no tiene cuenta Stripe conectada', async () => {
    repoMock.findPayoutAccount.mockResolvedValue({ stripeAccountId: null });

    await expect(createBookingCheckout(validInput(), CLIENT_ID)).rejects.toBeInstanceOf(
      ProviderNotChargeableError,
    );
    // Lo importante del test: sin este orden, un centro sin Stripe
    // dejaría reservas `pending` bloqueando sus propios huecos.
    expect(bookingMock.createBooking).not.toHaveBeenCalled();
    expect(stripeMock.paymentIntents.create).not.toHaveBeenCalled();
  });

  it('no crea la reserva si Stripe aún no habilita cargos en la cuenta', async () => {
    paymentsMock.getConnectAccountStatus.mockResolvedValue({ chargesEnabled: false });

    await expect(createBookingCheckout(validInput(), CLIENT_ID)).rejects.toBeInstanceOf(
      ProviderNotChargeableError,
    );
    expect(bookingMock.createBooking).not.toHaveBeenCalled();
  });

  it('libera el slot si Stripe rechaza la creación del PaymentIntent', async () => {
    stripeMock.paymentIntents.create.mockRejectedValue(new Error('card_declined'));

    await expect(createBookingCheckout(validInput(), CLIENT_ID)).rejects.toBeInstanceOf(
      PaymentIntentCreationError,
    );
    expect(bookingMock.bookingRepository.updateStatus).toHaveBeenCalledWith(
      'bk-1',
      'cancelled',
      expect.objectContaining({ cancelledAt: expect.any(Date) }),
    );
  });

  it('libera el slot si Stripe devuelve un intent sin client_secret', async () => {
    stripeMock.paymentIntents.create.mockResolvedValue({ id: 'pi_123', client_secret: null });

    await expect(createBookingCheckout(validInput(), CLIENT_ID)).rejects.toBeInstanceOf(
      PaymentIntentCreationError,
    );
    expect(bookingMock.bookingRepository.updateStatus).toHaveBeenCalledWith(
      'bk-1',
      'cancelled',
      expect.objectContaining({ cancelledAt: expect.any(Date) }),
    );
    expect(repoMock.attachPaymentIntent).not.toHaveBeenCalled();
  });

  it('rechaza un slotStartIso que no sea una fecha ISO válida', async () => {
    await expect(
      createBookingCheckout(validInput({ slotStartIso: 'mañana a las 5' }), CLIENT_ID),
    ).rejects.toThrow();
    expect(bookingMock.createBooking).not.toHaveBeenCalled();
  });
});
