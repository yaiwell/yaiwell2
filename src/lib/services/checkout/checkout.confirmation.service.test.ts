import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Tests de la lectura de la reserva para la pantalla de confirmación.
 *
 * Lo que importa: la titularidad va en el `where` (nunca se lee una
 * reserva ajena) y salen los datos del descuento congelado para pintar
 * el precio tachado.
 */

const findFirstMock = vi.hoisted(() => vi.fn());

vi.mock('@/lib/db/prisma', () => ({
  prisma: { booking: { findFirst: findFirstMock } },
}));

import { getBookingForConfirmation } from './checkout.confirmation.service';

describe('getBookingForConfirmation', () => {
  beforeEach(() => {
    findFirstMock.mockReset();
  });

  it('filtra por cliente y pide el descuento congelado de la reserva', async () => {
    const row = {
      id: 'bk-1',
      providerId: 'prov-1',
      serviceId: 'svc-1',
      startAt: new Date('2026-10-28T16:00:00.000Z'),
      endAt: new Date('2026-10-28T17:00:00.000Z'),
      status: 'confirmed',
      priceCents: 3600,
      originalPriceCents: 4500,
      discountPct: 20,
    };
    findFirstMock.mockResolvedValue(row);

    await expect(getBookingForConfirmation('bk-1', 'user-1')).resolves.toEqual(row);

    const args = findFirstMock.mock.calls[0]?.[0];
    expect(args.where).toEqual({ id: 'bk-1', clientId: 'user-1' });
    expect(args.select).toMatchObject({
      priceCents: true,
      originalPriceCents: true,
      discountPct: true,
    });
  });

  it('devuelve null si la reserva no existe o no es del cliente', async () => {
    findFirstMock.mockResolvedValue(null);
    await expect(getBookingForConfirmation('bk-x', 'user-1')).resolves.toBeNull();
  });
});
