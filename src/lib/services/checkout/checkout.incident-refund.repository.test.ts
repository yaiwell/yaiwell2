/**
 * Test de la escritura condicional del reembolso por incidencia: es la
 * barrera real contra una doble ejecución, y escribe la marca que impide
 * liberar la hora y permite reanudar. Ni su `where` ni su `data` pueden relajarse.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

const updateManyMock = vi.hoisted(() => vi.fn());
const findManyMock = vi.hoisted(() => vi.fn());

vi.mock('@/lib/db/prisma', () => ({
  prisma: { booking: { updateMany: updateManyMock, findMany: findManyMock } },
}));

import {
  UNFINISHED_INCIDENT_REFUND_WHERE,
  incidentRefundRepository,
} from './checkout.incident-refund.repository';
import { unfinishedRow } from './checkout.incident-refund.test-fixtures';

const AT = new Date('2026-11-05T10:00:00.000Z');
const MARK = { at: AT, by: 'admin-1', note: 'Avería en el centro' };

describe('incidentRefundRepository.cancelForIncident', () => {
  beforeEach(() => updateManyMock.mockReset());

  it('solo cancela sobre el estado leído, online y sin reembolso, y deja la marca', async () => {
    updateManyMock.mockResolvedValue({ count: 1 });

    await expect(
      incidentRefundRepository.cancelForIncident('bk-1', 'completed', MARK),
    ).resolves.toBe(true);

    expect(updateManyMock).toHaveBeenCalledWith({
      where: {
        id: 'bk-1',
        status: 'completed',
        paymentMode: 'online',
        refundedAt: null,
        stripeRefundId: null,
        incidentRefundAt: null,
      },
      data: {
        status: 'cancelled',
        cancelledAt: AT,
        incidentRefundAt: AT,
        incidentRefundBy: 'admin-1',
        incidentRefundNote: 'Avería en el centro',
      },
    });
  });

  it('devuelve false si otra ejecución ganó', async () => {
    updateManyMock.mockResolvedValue({ count: 0 });

    await expect(
      incidentRefundRepository.cancelForIncident('bk-1', 'confirmed', MARK),
    ).resolves.toBe(false);
  });
});

describe('reembolsos a medias', () => {
  it('lista solo las marcadas antes del corte, las más antiguas primero', async () => {
    findManyMock.mockResolvedValue([]);

    await incidentRefundRepository.findUnfinished(AT);

    expect(findManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          incidentRefundAt: { not: null, lte: AT },
          status: 'cancelled',
          stripeRefundId: null,
          refundFailedAt: null,
          refundedAt: null,
        },
        orderBy: { incidentRefundAt: 'asc' },
      }),
    );
  });

  it('la fila que deja un fallo sin grabar (`failed_unrecorded`) entra en la lista', () => {
    // Cancelar es lo único que llegó a escribirse: ni refund ni fallo.
    const row = unfinishedRow();

    expect(row.incidentRefundAt).not.toBeNull();
    expect(row.status).toBe(UNFINISHED_INCIDENT_REFUND_WHERE.status);
    expect(row.stripeRefundId).toBe(UNFINISHED_INCIDENT_REFUND_WHERE.stripeRefundId);
    expect(row.refundFailedAt).toBe(UNFINISHED_INCIDENT_REFUND_WHERE.refundFailedAt);
    expect(row.refundedAt).toBe(UNFINISHED_INCIDENT_REFUND_WHERE.refundedAt);
  });
});
