/**
 * Quién puede recibir una reserva (CLAUDE.md §4.bis «Equipo»).
 *
 * El `professionalId` llega del cliente: tras el lock, `bookForProfessional`
 * exige que el profesional siga activo, preste el servicio y esté dentro
 * del cupo del plan (los N más antiguos). Si no, `SlotUnavailableError`;
 * con «cualquiera disponible» se pasa al siguiente candidato.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { prismaMock, slotOffers, candidatesRepo, bookableIds } = vi.hoisted(() => {
  const prismaMock = {
    service: { findUnique: vi.fn() },
    booking: { findMany: vi.fn(async () => []), create: vi.fn() },
    scheduleBlock: { count: vi.fn(async () => 0) },
    professional: { findFirst: vi.fn() },
    $executeRaw: vi.fn(),
    $transaction: vi.fn(),
  };
  return {
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
    bookableIds: vi.fn(),
  };
});

vi.mock('@/lib/db/prisma', () => ({ prisma: prismaMock }));
vi.mock('@/lib/services/slot-offers', () => slotOffers);
vi.mock('@/lib/services/team/team.bookable', () => ({ getBookableProfessionalIds: bookableIds }));
vi.mock('./booking.candidates.repository', () => ({
  bookingCandidatesRepository: candidatesRepo,
}));

import { SlotUnavailableError } from './booking.errors';
import { createBooking } from './booking.service';

const SERVICE_ID = 'a1b2c3d4-e5f6-4789-8abc-def012345678';
const PRO_A = 'b2c3d4e5-f6a7-4890-9bcd-ef0123456789';
const PRO_B = 'c3d4e5f6-a7b8-4901-aabc-de0123456789';
const NOW = new Date('2030-01-10T08:00:00.000Z');
const SLOT = new Date('2030-01-10T12:00:00.000Z');
const input = { serviceId: SERVICE_ID, slotStart: SLOT.toISOString() };

/** Profesionales que prestan el servicio (relación `serviceLinks`). */
let staffOfService: string[] = [];

beforeEach(() => {
  vi.clearAllMocks();
  staffOfService = [PRO_A, PRO_B];
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
  prismaMock.professional.findFirst.mockImplementation(
    async (args: { where: { id: string; serviceLinks: { some: { serviceId: string } } } }) =>
      args.where.serviceLinks.some.serviceId === SERVICE_ID &&
      staffOfService.includes(args.where.id)
        ? { id: args.where.id }
        : null,
  );
  prismaMock.booking.create.mockImplementation(async (args: { data: unknown }) => ({
    id: 'bk-1',
    ...(args.data as object),
  }));
  bookableIds.mockResolvedValue([PRO_A, PRO_B]);
  slotOffers.findLiveOfferForSlot.mockResolvedValue(null);
  slotOffers.isBookableStart.mockResolvedValue(true);
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

describe('bookForProfessional · profesional elegido', () => {
  it('comprueba servicio y cupo dentro de la transacción del intento', async () => {
    const booking = await createBooking({ ...input, professionalId: PRO_A }, 'client-1', {
      now: NOW,
    });

    expect(booking.professionalId).toBe(PRO_A);
    expect(prismaMock.professional.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: PRO_A, deletedAt: null, serviceLinks: { some: { serviceId: SERVICE_ID } } },
      }),
    );
    expect(bookableIds).toHaveBeenCalledWith('prov-1', prismaMock);
  });

  it('rechaza a quien no presta el servicio', async () => {
    staffOfService = [PRO_B];

    await expect(
      createBooking({ ...input, professionalId: PRO_A }, 'client-1', { now: NOW }),
    ).rejects.toBeInstanceOf(SlotUnavailableError);
    expect(prismaMock.booking.create).not.toHaveBeenCalled();
  });

  it('rechaza a quien quedó fuera del cupo del plan', async () => {
    // Plan de 1: solo el más antiguo (A) acepta reservas.
    bookableIds.mockResolvedValue([PRO_A]);

    await expect(
      createBooking({ ...input, professionalId: PRO_B }, 'client-1', { now: NOW }),
    ).rejects.toBeInstanceOf(SlotUnavailableError);
    expect(prismaMock.booking.create).not.toHaveBeenCalled();
  });
});

describe('bookForProfessional · «cualquiera disponible»', () => {
  it('salta al candidato que no presta el servicio', async () => {
    staffOfService = [PRO_B];

    const booking = await createBooking(input, 'client-1', { now: NOW });

    expect(booking.professionalId).toBe(PRO_B);
    expect(prismaMock.$transaction).toHaveBeenCalledTimes(2);
  });

  it('salta al candidato fuera de plan', async () => {
    bookableIds.mockResolvedValue([PRO_B]);

    const booking = await createBooking(input, 'client-1', { now: NOW });

    expect(booking.professionalId).toBe(PRO_B);
  });

  it('nadie reservable → SlotUnavailableError sin crear nada', async () => {
    bookableIds.mockResolvedValue([]);

    await expect(createBooking(input, 'client-1', { now: NOW })).rejects.toBeInstanceOf(
      SlotUnavailableError,
    );
    expect(prismaMock.booking.create).not.toHaveBeenCalled();
  });
});
