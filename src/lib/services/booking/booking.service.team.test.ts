/**
 * Reserva con varios profesionales (CLAUDE.md §4.bis «Equipo»).
 *
 * Sin profesional elegido («cualquiera disponible») el servidor ordena a
 * los candidatos y prueba cada uno en su propia transacción, bloqueando
 * solo a ese profesional: si está ocupado (solape, bloqueo o violación
 * de la restricción de exclusión), pasa al siguiente.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

type BookingRow = { professionalId: string; startAt: Date; endAt: Date };

const { store, prismaMock, slotOffers, candidatesRepo } = vi.hoisted(() => {
  const store = { bookings: [] as BookingRow[], blockedProfessionals: [] as string[] };
  const prismaMock = {
    service: { findUnique: vi.fn() },
    booking: {
      // `findOverlapping`: solo nos importa el profesional del `where`.
      findMany: vi.fn(async (args: { where: { professionalId: string } }) =>
        store.bookings.filter((b) => b.professionalId === args.where.professionalId),
      ),
      create: vi.fn(),
    },
    scheduleBlock: {
      count: vi.fn(async (args: { where: { professionalId: string } }) =>
        store.blockedProfessionals.includes(args.where.professionalId) ? 1 : 0,
      ),
    },
    $executeRaw: vi.fn(),
    $transaction: vi.fn(),
  };
  return {
    store,
    prismaMock,
    slotOffers: {
      findLiveOfferForSlot: vi.fn(),
      isBookableStart: vi.fn(),
      getBookableCandidates: vi.fn(),
      retireOfferOfCancelledBooking: vi.fn(),
    },
    candidatesRepo: {
      findProfessionalsCreatedAt: vi.fn(),
      countActiveBookingsByProfessional: vi.fn(),
    },
  };
});

vi.mock('@/lib/db/prisma', () => ({ prisma: prismaMock }));
vi.mock('@/lib/services/slot-offers', () => slotOffers);
vi.mock('./booking.candidates.repository', () => ({
  bookingCandidatesRepository: candidatesRepo,
}));

import { SlotUnavailableError } from './booking.errors';
import { createBooking } from './booking.service';

const SERVICE_ID = 'a1b2c3d4-e5f6-4789-8abc-def012345678';
const PRO_A = 'b2c3d4e5-f6a7-4890-9bcd-ef0123456789';
const PRO_B = 'c3d4e5f6-a7b8-4901-aabc-de0123456789';
// Lejos en el futuro: la antelación mínima del esquema Zod usa el reloj real.
const NOW = new Date('2030-01-10T08:00:00.000Z');
const SLOT = new Date('2030-01-10T12:00:00.000Z');
const input = { serviceId: SERVICE_ID, slotStart: SLOT.toISOString() };

/** Error tal como llega de Postgres al chocar con `bookings_no_overlap_confirmed`. */
const exclusionError = Object.assign(
  new Error('conflicting key value violates exclusion constraint "bookings_no_overlap_confirmed"'),
  { code: '23P01' },
);

/** Profesionales a los que se intentó crear la reserva, en orden. */
const lockedProfessionals = () => prismaMock.$executeRaw.mock.calls.map((call) => call[1]);

beforeEach(() => {
  vi.clearAllMocks();
  store.bookings = [];
  store.blockedProfessionals = [];
  prismaMock.$transaction.mockImplementation((fn: (tx: unknown) => unknown) => fn(prismaMock));
  prismaMock.service.findUnique.mockResolvedValue({
    id: SERVICE_ID,
    providerId: 'prov-1',
    durationMinutes: 60,
    priceCents: 5000,
    isActive: true,
    deletedAt: null,
    provider: { plan: { commissionRateBps: 800 } },
  });
  prismaMock.booking.create.mockImplementation(async (args: { data: unknown }) => ({
    id: 'bk-1',
    ...(args.data as object),
  }));
  slotOffers.findLiveOfferForSlot.mockResolvedValue(null);
  slotOffers.getBookableCandidates.mockResolvedValue([
    { professionalId: PRO_A, offer: null },
    { professionalId: PRO_B, offer: null },
  ]);
  candidatesRepo.findProfessionalsCreatedAt.mockResolvedValue([
    { id: PRO_A, createdAt: new Date('2026-01-01') },
    { id: PRO_B, createdAt: new Date('2026-02-01') },
  ]);
  candidatesRepo.countActiveBookingsByProfessional.mockResolvedValue(new Map());
});

describe('createBooking · «cualquiera disponible»', () => {
  it('asigna al primer candidato libre, cada intento en su transacción', async () => {
    const booking = await createBooking(input, 'client-1', { now: NOW });

    expect(booking.professionalId).toBe(PRO_A);
    expect(prismaMock.$transaction).toHaveBeenCalledOnce();
    expect(lockedProfessionals()).toEqual([PRO_A]);
    expect(slotOffers.isBookableStart).not.toHaveBeenCalled();
  });

  it('si el primero está ocupado, prueba con el segundo', async () => {
    store.bookings = [{ professionalId: PRO_A, startAt: SLOT, endAt: SLOT }];

    const booking = await createBooking(input, 'client-1', { now: NOW });

    expect(booking.professionalId).toBe(PRO_B);
    expect(prismaMock.$transaction).toHaveBeenCalledTimes(2);
    // Cada transacción bloquea solo a su profesional.
    expect(lockedProfessionals()).toEqual([PRO_A, PRO_B]);
  });

  it('un bloqueo de agenda del primero también pasa al segundo', async () => {
    store.blockedProfessionals = [PRO_A];

    const booking = await createBooking(input, 'client-1', { now: NOW });

    expect(booking.professionalId).toBe(PRO_B);
  });

  it('si la BD rechaza por exclusión (23P01), reintenta con el siguiente', async () => {
    prismaMock.booking.create.mockRejectedValueOnce(exclusionError);

    const booking = await createBooking(input, 'client-1', { now: NOW, paymentMode: 'online' });

    expect(booking.professionalId).toBe(PRO_B);
    expect(prismaMock.booking.create).toHaveBeenCalledTimes(2);
  });

  it('todos ocupados → SlotUnavailableError, sin crear nada', async () => {
    store.bookings = [
      { professionalId: PRO_A, startAt: SLOT, endAt: SLOT },
      { professionalId: PRO_B, startAt: SLOT, endAt: SLOT },
    ];

    await expect(createBooking(input, 'client-1', { now: NOW })).rejects.toBeInstanceOf(
      SlotUnavailableError,
    );
    expect(prismaMock.booking.create).not.toHaveBeenCalled();
  });

  it('sin candidatos para esa hora → SlotUnavailableError sin abrir transacción', async () => {
    slotOffers.getBookableCandidates.mockResolvedValue([]);

    await expect(createBooking(input, 'client-1', { now: NOW })).rejects.toBeInstanceOf(
      SlotUnavailableError,
    );
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it('un error que no es de hueco ocupado no se reintenta', async () => {
    prismaMock.booking.create.mockRejectedValueOnce(new Error('boom'));

    await expect(createBooking(input, 'client-1', { now: NOW })).rejects.toThrow('boom');
    expect(prismaMock.$transaction).toHaveBeenCalledOnce();
  });

  it('prefiere a quien tiene la hora con descuento y le aplica su oferta', async () => {
    slotOffers.getBookableCandidates.mockResolvedValue([
      { professionalId: PRO_A, offer: null },
      { professionalId: PRO_B, offer: { offerId: 'offer-b', discountPct: 20 } },
    ]);
    slotOffers.findLiveOfferForSlot.mockImplementation(async (professionalId: string) =>
      professionalId === PRO_B
        ? {
            id: 'offer-b',
            professionalId: PRO_B,
            discounts: { over2h: 20, oneToTwoHours: 20, underOneHour: 20 },
          }
        : null,
    );

    const booking = await createBooking(input, 'client-1', { now: NOW });

    expect(booking.professionalId).toBe(PRO_B);
    expect(booking).toMatchObject({ priceCents: 4000, slotOfferId: 'offer-b', discountPct: 20 });
  });

  it('a igualdad de ofertas, el que tiene menos reservas ese día', async () => {
    candidatesRepo.countActiveBookingsByProfessional.mockResolvedValue(
      new Map([
        [PRO_A, 3],
        [PRO_B, 1],
      ]),
    );

    const booking = await createBooking(input, 'client-1', { now: NOW });

    expect(booking.professionalId).toBe(PRO_B);
  });
});

describe('createBooking · profesional elegido', () => {
  it('solo intenta con ese profesional y no busca candidatos', async () => {
    slotOffers.isBookableStart.mockResolvedValue(true);
    store.bookings = [{ professionalId: PRO_B, startAt: SLOT, endAt: SLOT }];

    await expect(
      createBooking({ ...input, professionalId: PRO_B }, 'client-1', { now: NOW }),
    ).rejects.toBeInstanceOf(SlotUnavailableError);
    expect(slotOffers.isBookableStart).toHaveBeenCalledWith(SERVICE_ID, PRO_B, SLOT, NOW);
    expect(slotOffers.getBookableCandidates).not.toHaveBeenCalled();
    expect(lockedProfessionals()).toEqual([PRO_B]);
  });

  it('una hora que ese profesional no ofrece se rechaza sin transacción', async () => {
    slotOffers.isBookableStart.mockResolvedValue(false);

    await expect(
      createBooking({ ...input, professionalId: PRO_A }, 'client-1', { now: NOW }),
    ).rejects.toBeInstanceOf(SlotUnavailableError);
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });
});
