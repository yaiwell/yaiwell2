/**
 * Tests de la retención de franjas por reservas `pending`.
 *
 * El caso límite que importa: a 29:59 la `pending` todavía bloquea; a
 * 30:01 ya no. Se comprueba en las dos formas de la regla (fragmento
 * `where` para BD y predicado en memoria para el webhook) y en el
 * `where` real que manda `findOverlapping` a Prisma.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

const prismaMock = vi.hoisted(() => ({ booking: { findMany: vi.fn() } }));

vi.mock('@/lib/db/prisma', () => ({ prisma: prismaMock }));

import {
  PENDING_HOLD_MINUTES,
  activeBookingWhere,
  getPendingHoldCutoff,
  isBookingHoldingSlot,
} from './booking.hold';
import { bookingRepository } from './booking.repository';

const NOW = new Date('2026-10-26T10:00:00.000Z');

function createdAgo(minutes: number, seconds: number): Date {
  return new Date(NOW.getTime() - (minutes * 60 + seconds) * 1000);
}

beforeEach(() => {
  vi.clearAllMocks();
  prismaMock.booking.findMany.mockResolvedValue([]);
});

describe('retención de pending', () => {
  it('la retención es de 30 minutos', () => {
    expect(PENDING_HOLD_MINUTES).toBe(30);
    expect(getPendingHoldCutoff(NOW)).toEqual(new Date('2026-10-26T09:30:00.000Z'));
  });

  it('una pending creada hace 29:59 sigue bloqueando la franja', () => {
    expect(isBookingHoldingSlot({ status: 'pending', createdAt: createdAgo(29, 59) }, NOW)).toBe(
      true,
    );
  });

  it('una pending creada hace 30:00 exactos sigue bloqueando (corte con gte)', () => {
    expect(isBookingHoldingSlot({ status: 'pending', createdAt: createdAgo(30, 0) }, NOW)).toBe(
      true,
    );
  });

  it('una pending creada hace 30:01 ya no bloquea la franja', () => {
    expect(isBookingHoldingSlot({ status: 'pending', createdAt: createdAgo(30, 1) }, NOW)).toBe(
      false,
    );
  });

  it('confirmed bloquea siempre y cancelled nunca', () => {
    const old = createdAgo(600, 0);
    expect(isBookingHoldingSlot({ status: 'confirmed', createdAt: old }, NOW)).toBe(true);
    expect(isBookingHoldingSlot({ status: 'cancelled', createdAt: NOW }, NOW)).toBe(false);
  });

  it('el where de BD aplica el mismo corte que el predicado en memoria', () => {
    expect(activeBookingWhere(NOW)).toEqual({
      OR: [
        { status: 'confirmed' },
        { status: 'pending', createdAt: { gte: new Date('2026-10-26T09:30:00.000Z') } },
      ],
    });
  });

  it('findOverlapping filtra con el where de reserva activa', async () => {
    const start = new Date('2026-10-27T10:00:00.000Z');
    const end = new Date('2026-10-27T11:00:00.000Z');

    await bookingRepository.findOverlapping('pro-1', start, end, NOW);

    expect(prismaMock.booking.findMany).toHaveBeenCalledWith({
      where: {
        professionalId: 'pro-1',
        ...activeBookingWhere(NOW),
        startAt: { lt: end },
        endAt: { gt: start },
      },
    });
  });
});
