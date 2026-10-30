/**
 * Tests de la consulta del tope de reservas en el local: solo cuentan las
 * `confirmed` en el local que aún no han empezado (las pasadas,
 * canceladas u online quedan fuera por el filtro).
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ count: vi.fn(), executeRaw: vi.fn() }));

vi.mock('server-only', () => ({}));
vi.mock('@/lib/db/prisma', () => ({
  prisma: { booking: { count: mocks.count }, $executeRaw: mocks.executeRaw },
}));

import { onsiteRepository } from './checkout.onsite.repository';

const NOW = new Date('2026-11-02T10:00:00.000Z');

beforeEach(() => {
  vi.clearAllMocks();
  mocks.count.mockResolvedValue(2);
});

describe('onsiteRepository.countActiveOnsiteBookings', () => {
  it('filtra por cliente, en el local, confirmed y con inicio posterior a ahora', async () => {
    await expect(onsiteRepository.countActiveOnsiteBookings('client-1', NOW)).resolves.toBe(2);
    expect(mocks.count).toHaveBeenCalledWith({
      where: {
        clientId: 'client-1',
        paymentMode: 'onsite',
        status: 'confirmed',
        startAt: { gt: NOW },
      },
    });
  });

  it('usa la transacción si se le pasa', async () => {
    const txCount = vi.fn().mockResolvedValue(3);
    const tx = { booking: { count: txCount } } as never;
    await expect(onsiteRepository.countActiveOnsiteBookings('client-1', NOW, tx)).resolves.toBe(3);
    expect(mocks.count).not.toHaveBeenCalled();
  });
});

describe('onsiteRepository.lockClientOnsite', () => {
  it('toma un advisory lock de transacción con clave propia del cliente', async () => {
    const executeRaw = vi.fn().mockResolvedValue(1);
    await onsiteRepository.lockClientOnsite({ $executeRaw: executeRaw } as never, 'client-1');
    const [sql, key] = executeRaw.mock.calls[0] as [TemplateStringsArray, string];
    expect(sql.join('?')).toContain('pg_advisory_xact_lock(hashtext(?))');
    expect(key).toBe('onsite-client:client-1');
  });
});
