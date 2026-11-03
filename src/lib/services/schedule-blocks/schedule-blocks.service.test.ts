/**
 * Tests del servicio de bloqueos de agenda.
 *
 * Usamos los repositorios reales sobre un Prisma falso. El `findMany` de
 * reservas interpreta el `where` que recibe (profesional, `OR` de
 * estados con retención y solape), así que estos tests cazan si el
 * repositorio deja de usar el mismo criterio de «activa» que
 * `createBooking`.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

type BookingRow = {
  id: string;
  professionalId: string;
  status: string;
  createdAt: Date;
  startAt: Date;
  endAt: Date;
  client: { fullName: string | null };
  service: { name: Record<string, string> };
};

type StatusClause = { status: string; createdAt?: { gte: Date } };

type BookingWhere = {
  professionalId: string;
  OR: StatusClause[];
  startAt: { lt: Date };
  endAt: { gt: Date };
};

const { prismaMock, store } = vi.hoisted(() => {
  const store = { bookings: [] as BookingRow[] };
  const prismaMock = {
    $transaction: vi.fn(),
    $executeRaw: vi.fn(),
    professional: { findFirst: vi.fn() },
    booking: {
      findMany: vi.fn(async (args: { where: BookingWhere }) => {
        const w = args.where;
        return store.bookings.filter(
          (b) =>
            b.professionalId === w.professionalId &&
            w.OR.some(
              (c) => c.status === b.status && (!c.createdAt || b.createdAt >= c.createdAt.gte),
            ) &&
            b.startAt < w.startAt.lt &&
            b.endAt > w.endAt.gt,
        );
      }),
    },
    slotOffer: { updateMany: vi.fn() },
    scheduleBlock: { create: vi.fn(), findUnique: vi.fn(), updateMany: vi.fn() },
  };
  return { prismaMock, store };
});

vi.mock('@/lib/db/prisma', () => ({ prisma: prismaMock }));

import {
  ScheduleBlockConflictError,
  ScheduleBlockEndBeforeStartError,
  ScheduleBlockInPastError,
  ScheduleBlockInvalidInputError,
  ScheduleBlockNoProfessionalError,
  ScheduleBlockNotFoundError,
  ScheduleBlockTooFarError,
  ScheduleBlockTooLongError,
} from './schedule-blocks.errors';
import { createScheduleBlock, removeScheduleBlock } from './schedule-blocks.service';

// Martes 3-nov-2026, 11:02 en Madrid (CET, +01:00).
const NOW = new Date('2026-11-03T10:02:00.000Z');
const MIN = 60 * 1000;
const CTX = { providerId: 'prov-1', userId: 'user-1', now: NOW };
const INPUT = {
  startDateKey: '2026-11-10',
  startTime: '10:00',
  endDateKey: '2026-11-10',
  endTime: '14:00',
};
// 10:00-14:00 Madrid = 09:00Z-13:00Z.
const START = new Date('2026-11-10T09:00:00.000Z');
const END = new Date('2026-11-10T13:00:00.000Z');

function booking(overrides: Partial<BookingRow> = {}): BookingRow {
  return {
    id: 'bk-1',
    professionalId: 'pro-1',
    status: 'confirmed',
    createdAt: new Date(NOW.getTime() - 24 * 60 * MIN),
    startAt: new Date('2026-11-10T11:00:00.000Z'),
    endAt: new Date('2026-11-10T12:00:00.000Z'),
    client: { fullName: 'Marta R.' },
    service: { name: { es: 'Corte', en: 'Haircut' } },
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  store.bookings = [];
  prismaMock.$transaction.mockImplementation((fn: (tx: unknown) => unknown) => fn(prismaMock));
  prismaMock.professional.findFirst.mockResolvedValue({ id: 'pro-1' });
  prismaMock.slotOffer.updateMany.mockResolvedValue({ count: 0 });
  prismaMock.scheduleBlock.create.mockResolvedValue({ id: 'blk-1' });
  prismaMock.scheduleBlock.updateMany.mockResolvedValue({ count: 1 });
});

describe('createScheduleBlock', () => {
  it('crea el bloqueo en UTC, ligado al profesional y con autor', async () => {
    const result = await createScheduleBlock({ ...INPUT, reason: 'Médico' }, CTX);

    expect(result).toEqual({ id: 'blk-1' });
    expect(prismaMock.scheduleBlock.create).toHaveBeenCalledWith({
      data: {
        providerId: 'prov-1',
        professionalId: 'pro-1',
        startAt: START,
        endAt: END,
        reason: 'Médico',
        createdBy: 'user-1',
      },
      select: { id: true },
    });
  });

  it('toma el bloqueo por profesional antes de mirar las reservas', async () => {
    await createScheduleBlock(INPUT, CTX);

    expect(prismaMock.$transaction).toHaveBeenCalledOnce();
    const lockAt = prismaMock.$executeRaw.mock.invocationCallOrder[0];
    const readAt = prismaMock.booking.findMany.mock.invocationCallOrder[0];
    const writeAt = prismaMock.scheduleBlock.create.mock.invocationCallOrder[0];
    expect(lockAt).toBeLessThan(readAt);
    expect(readAt).toBeLessThan(writeAt);
  });

  it('retira las ofertas activas que solapan, en la misma transacción', async () => {
    await createScheduleBlock(INPUT, CTX);

    expect(prismaMock.slotOffer.updateMany).toHaveBeenCalledWith({
      where: {
        professionalId: 'pro-1',
        status: 'active',
        startAt: { lt: END },
        endAt: { gt: START },
      },
      data: { status: 'withdrawn', withdrawnAt: NOW },
    });
  });

  it('una reserva confirmada que solapa es conflicto, con la lista de citas', async () => {
    store.bookings = [booking()];

    const err = await createScheduleBlock(INPUT, CTX).catch((e: unknown) => e);

    expect(err).toBeInstanceOf(ScheduleBlockConflictError);
    expect((err as ScheduleBlockConflictError).conflicts).toEqual([
      {
        bookingId: 'bk-1',
        startAt: booking().startAt,
        clientName: 'Marta R.',
        serviceName: { es: 'Corte', en: 'Haircut' },
      },
    ]);
    expect(prismaMock.scheduleBlock.create).not.toHaveBeenCalled();
    expect(prismaMock.slotOffer.updateMany).not.toHaveBeenCalled();
  });

  it('una pending dentro de su retención también es conflicto', async () => {
    store.bookings = [
      booking({ status: 'pending', createdAt: new Date(NOW.getTime() - 10 * MIN) }),
    ];

    await expect(createScheduleBlock(INPUT, CTX)).rejects.toBeInstanceOf(
      ScheduleBlockConflictError,
    );
  });

  it('una pending caducada o una cancelada no bloquean', async () => {
    store.bookings = [
      booking({ status: 'pending', createdAt: new Date(NOW.getTime() - 45 * MIN) }),
      booking({ id: 'bk-2', status: 'cancelled' }),
    ];

    await expect(createScheduleBlock(INPUT, CTX)).resolves.toEqual({ id: 'blk-1' });
  });

  it('una reserva pegada al bloqueo no es conflicto', async () => {
    store.bookings = [booking({ startAt: END, endAt: new Date(END.getTime() + 60 * MIN) })];

    await expect(createScheduleBlock(INPUT, CTX)).resolves.toEqual({ id: 'blk-1' });
  });

  it('admite «desde ya» redondeado a 5 minutos, pero no antes', async () => {
    const today = { startDateKey: '2026-11-03', endDateKey: '2026-11-03', endTime: '13:00' };

    await expect(createScheduleBlock({ ...today, startTime: '11:00' }, CTX)).resolves.toEqual({
      id: 'blk-1',
    });
    await expect(createScheduleBlock({ ...today, startTime: '10:55' }, CTX)).rejects.toBeInstanceOf(
      ScheduleBlockInPastError,
    );
  });

  it('rechaza un fin anterior o igual al inicio', async () => {
    await expect(createScheduleBlock({ ...INPUT, endTime: '10:00' }, CTX)).rejects.toBeInstanceOf(
      ScheduleBlockEndBeforeStartError,
    );
  });

  it('acepta 60 días justos y rechaza uno más largo', async () => {
    const sixtyDays = { ...INPUT, endDateKey: '2027-01-09', endTime: '10:00' };

    await expect(createScheduleBlock(sixtyDays, CTX)).resolves.toEqual({ id: 'blk-1' });
    await expect(
      createScheduleBlock({ ...sixtyDays, endTime: '10:05' }, CTX),
    ).rejects.toBeInstanceOf(ScheduleBlockTooLongError);
  });

  it('rechaza empezar a más de un año vista', async () => {
    const farAway = { startDateKey: '2027-11-04', startTime: '10:00', endDateKey: '2027-11-04' };

    await expect(createScheduleBlock({ ...farAway, endTime: '12:00' }, CTX)).rejects.toBeInstanceOf(
      ScheduleBlockTooFarError,
    );
  });

  it('una entrada mal formada es INVALID_INPUT sin tocar la BD', async () => {
    await expect(createScheduleBlock({ ...INPUT, startTime: '10:07' }, CTX)).rejects.toBeInstanceOf(
      ScheduleBlockInvalidInputError,
    );
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it('sin profesional activo no crea nada', async () => {
    prismaMock.professional.findFirst.mockResolvedValue(null);

    await expect(createScheduleBlock(INPUT, CTX)).rejects.toBeInstanceOf(
      ScheduleBlockNoProfessionalError,
    );
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });
});

describe('removeScheduleBlock', () => {
  it('borra en suave con autor e instante', async () => {
    prismaMock.scheduleBlock.findUnique.mockResolvedValue({
      id: 'blk-1',
      providerId: 'prov-1',
      deletedAt: null,
    });

    await removeScheduleBlock('blk-1', CTX);

    expect(prismaMock.scheduleBlock.updateMany).toHaveBeenCalledWith({
      where: { id: 'blk-1', deletedAt: null },
      data: { deletedAt: NOW, deletedBy: 'user-1' },
    });
  });

  it('es idempotente: uno ya quitado no falla ni se reescribe', async () => {
    prismaMock.scheduleBlock.findUnique.mockResolvedValue({
      id: 'blk-1',
      providerId: 'prov-1',
      deletedAt: new Date('2026-11-01T00:00:00.000Z'),
    });

    await expect(removeScheduleBlock('blk-1', CTX)).resolves.toBeUndefined();
    expect(prismaMock.scheduleBlock.updateMany).not.toHaveBeenCalled();
  });

  it('uno de otro negocio responde como inexistente', async () => {
    prismaMock.scheduleBlock.findUnique.mockResolvedValue({
      id: 'blk-1',
      providerId: 'prov-2',
      deletedAt: null,
    });

    await expect(removeScheduleBlock('blk-1', CTX)).rejects.toBeInstanceOf(
      ScheduleBlockNotFoundError,
    );
    expect(prismaMock.scheduleBlock.updateMany).not.toHaveBeenCalled();
  });

  it('un id inexistente o vacío es NOT_FOUND', async () => {
    prismaMock.scheduleBlock.findUnique.mockResolvedValue(null);

    await expect(removeScheduleBlock('nope', CTX)).rejects.toBeInstanceOf(
      ScheduleBlockNotFoundError,
    );
    await expect(removeScheduleBlock('', CTX)).rejects.toBeInstanceOf(ScheduleBlockNotFoundError);
  });
});
