/**
 * Test de lo que cuenta como reembolso abierto al eliminar una cuenta: un
 * reembolso por incidencia a medias también es dinero sin devolver.
 */
import { describe, expect, it, vi } from 'vitest';

const countMock = vi.hoisted(() => vi.fn());

vi.mock('@/lib/db/prisma', () => ({ prisma: { booking: { count: countMock } } }));

import { accountRepository } from './account.repository';

describe('accountRepository.countOpenRefunds', () => {
  it('cuenta la cola, los emitidos sin confirmar y las incidencias a medias', async () => {
    countMock.mockResolvedValue(1);

    await expect(accountRepository.countOpenRefunds('user-1')).resolves.toBe(1);

    expect(countMock).toHaveBeenCalledWith({
      where: {
        clientId: 'user-1',
        OR: [
          { refundFailedAt: { not: null }, refundedAt: null, refundDismissedAt: null },
          { stripeRefundId: { not: null }, refundedAt: null },
          {
            incidentRefundAt: { not: null },
            status: 'cancelled',
            stripeRefundId: null,
            refundFailedAt: null,
            refundedAt: null,
          },
        ],
      },
    });
  });
});
