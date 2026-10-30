/**
 * Fixtures compartidos por los tests del cierre de reservas (completar,
 * no presentado y cierre automático). Solo para tests.
 */

import { vi } from 'vitest';

export const BOOKING_ID = 'c3d4e5f6-a7b8-4901-aabc-de0123456789';
export const PROVIDER_ID = 'd4e5f6a7-b8c9-4012-8bcd-ef0123456789';
export const OWNER_ID = 'user-provider';
export const CLIENT_ID = 'user-client';

/** Inicio de referencia de la reserva. */
export const START = new Date('2026-11-02T10:00:00.000Z');
export const HOUR = 60 * 60 * 1000;
export const at = (ms: number) => new Date(START.getTime() + ms);

/** Construye el mock de Prisma con lo que tocan estos servicios. */
export function createPrismaMock() {
  const prisma = {
    booking: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      updateMany: vi.fn(),
    },
    onsiteCommissionCharge: { create: vi.fn() },
    clientSanction: {
      findMany: vi.fn(),
      createMany: vi.fn(),
      updateMany: vi.fn(),
    },
    // La transacción ejecuta el callback con el propio mock como `tx`.
    $transaction: vi.fn(),
  };
  prisma.$transaction.mockImplementation((fn: (tx: typeof prisma) => unknown) => fn(prisma));
  return prisma;
}

/** Reserva leída por `bookingRepository.findById` (con `provider`). */
export function fakeBooking(
  overrides: Partial<{
    status: string;
    paymentMode: 'online' | 'onsite';
    startAt: Date;
    noShowAt: Date | null;
    ownerId: string;
    commissionCents: number;
  }> = {},
) {
  return {
    id: BOOKING_ID,
    clientId: CLIENT_ID,
    providerId: PROVIDER_ID,
    startAt: overrides.startAt ?? START,
    endAt: new Date((overrides.startAt ?? START).getTime() + HOUR),
    status: overrides.status ?? 'confirmed',
    paymentMode: overrides.paymentMode ?? 'onsite',
    commissionCents: overrides.commissionCents ?? 400,
    noShowAt: overrides.noShowAt ?? null,
    provider: { id: PROVIDER_ID, userId: overrides.ownerId ?? OWNER_ID },
  };
}
