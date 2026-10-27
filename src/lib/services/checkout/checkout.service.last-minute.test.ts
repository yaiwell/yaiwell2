/**
 * Tests de la decisión "reserva de última hora" en el checkout.
 *
 * La decide el servidor con el `createdAt` de la reserva recién creada,
 * no el reloj del navegador: `startAt − createdAt < 2 h`. Probamos los
 * dos lados del límite (1h59 sí, 2h00 no).
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
  ServiceNotFoundError: class ServiceNotFoundError extends Error {},
}));

const paymentsMock = vi.hoisted(() => ({ getConnectAccountStatus: vi.fn() }));

vi.mock('@/lib/services/payments', () => ({
  getConnectAccountStatus: paymentsMock.getConnectAccountStatus,
}));

const repoMock = vi.hoisted(() => ({
  findPayoutAccount: vi.fn(),
  attachPaymentIntent: vi.fn(),
}));

vi.mock('./checkout.repository', () => ({ checkoutRepository: repoMock }));

import { createBookingCheckout } from './checkout.service';

const SERVICE_ID = '3f2b8c1e-1111-4a2b-9c3d-1a2b3c4d5e6f';
const PROVIDER_ID = '70a8dc5a-2fed-4aa4-907c-ad93a49eb879';
const PROFESSIONAL_ID = 'ab12cd34-5678-4e90-b123-456789abcdef';

/** Momento en que la BD crea la reserva. */
const CREATED_AT = new Date('2026-10-05T10:00:00.000Z');

/** Simula la reserva que devuelve `createBooking` para un inicio dado. */
function bookingStartingAt(startIso: string) {
  const startAt = new Date(startIso);
  return {
    id: 'bk-1',
    providerId: PROVIDER_ID,
    serviceId: SERVICE_ID,
    priceCents: 4500,
    commissionCents: 360,
    startAt,
    endAt: new Date(startAt.getTime() + 60 * 60 * 1000),
    createdAt: CREATED_AT,
  };
}

async function checkoutFor(startIso: string) {
  bookingMock.createBooking.mockResolvedValue(bookingStartingAt(startIso));
  return createBookingCheckout({ serviceId: SERVICE_ID, slotStartIso: startIso }, 'client-1');
}

beforeEach(() => {
  vi.clearAllMocks();
  availabilityRepoMock.findServiceForAvailability.mockResolvedValue({
    id: SERVICE_ID,
    providerId: PROVIDER_ID,
    professionalId: PROFESSIONAL_ID,
    durationMinutes: 60,
  });
  repoMock.findPayoutAccount.mockResolvedValue({ stripeAccountId: 'acct_1' });
  paymentsMock.getConnectAccountStatus.mockResolvedValue({ chargesEnabled: true });
  stripeMock.paymentIntents.create.mockResolvedValue({ id: 'pi_1', client_secret: 'pi_1_secret' });
});

describe('createBookingCheckout — reserva de última hora', () => {
  it('marca isLastMinute si la reserva empieza 1h59 después de crearse', async () => {
    const session = await checkoutFor('2026-10-05T11:59:00.000Z');
    expect(session.isLastMinute).toBe(true);
  });

  it('no la marca si empieza justo 2h00 después de crearse', async () => {
    const session = await checkoutFor('2026-10-05T12:00:00.000Z');
    expect(session.isLastMinute).toBe(false);
  });
});
