import { ZodError } from 'zod';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    clientSanction: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      createMany: vi.fn(),
      updateMany: vi.fn(),
    },
  },
}));

import { prisma } from '@/lib/db/prisma';

import { SanctionAlreadyRevokedError, SanctionNotFoundError } from './sanctions.errors';
import { sanctionsRepository } from './sanctions.repository';
import {
  getClientOnsiteEligibility,
  listActiveSanctions,
  listActiveSanctionsForSupport,
  revokeSanction,
} from './sanctions.service';

const mockPrisma = vi.mocked(prisma, true);
const SANCTION_ID = 'a1b2c3d4-e5f6-4789-8abc-def012345678';
const NOW = new Date('2026-06-01T12:00:00Z');
const row = (iso: string) => ({ occurredAt: new Date(iso), revokedAt: null });

beforeEach(() => {
  vi.clearAllMocks();
});

describe('getClientOnsiteEligibility', () => {
  it('sin sanciones, permitido', async () => {
    mockPrisma.clientSanction.findMany.mockResolvedValue([]);

    const result = await getClientOnsiteEligibility('user-1', NOW);

    expect(result).toEqual({ allowed: true, restrictedUntil: null, sanctionsInWindow: 0 });
    // Solo lee 16 meses atrás (15 + margen por marcarla tarde) y solo las vigentes.
    const where = mockPrisma.clientSanction.findMany.mock.calls[0][0]?.where;
    expect(where).toMatchObject({ userId: 'user-1', revokedAt: null });
    expect((where?.occurredAt as { gte: Date }).gte.toISOString()).toBe('2025-02-01T12:00:00.000Z');
  });

  it('con 2 sanciones en 12 meses, permitido y cuenta 2', async () => {
    mockPrisma.clientSanction.findMany.mockResolvedValue([
      row('2026-02-01T10:00:00Z'),
      row('2026-05-01T10:00:00Z'),
    ] as never);

    const result = await getClientOnsiteEligibility('user-1', NOW);

    expect(result).toEqual({ allowed: true, restrictedUntil: null, sanctionsInWindow: 2 });
  });

  it('con 3 en 12 meses, bloqueado hasta 3 meses después de la tercera', async () => {
    mockPrisma.clientSanction.findMany.mockResolvedValue([
      row('2026-02-01T10:00:00Z'),
      row('2026-04-01T10:00:00Z'),
      row('2026-05-15T10:00:00Z'),
    ] as never);

    const result = await getClientOnsiteEligibility('user-1', NOW);

    expect(result.allowed).toBe(false);
    expect(result.restrictedUntil?.toISOString()).toBe('2026-08-15T10:00:00.000Z');
    expect(result.sanctionsInWindow).toBe(3);
  });
});

describe('listActiveSanctions', () => {
  it('devuelve las vigentes', async () => {
    const item = {
      id: SANCTION_ID,
      bookingId: 'b-1',
      reason: 'no_show',
      occurredAt: NOW,
      createdAt: NOW,
    };
    mockPrisma.clientSanction.findMany.mockResolvedValue([item] as never);

    await expect(listActiveSanctions('user-1')).resolves.toEqual([item]);
  });
});

describe('revokeSanction', () => {
  const input = { sanctionId: SANCTION_ID, reason: 'Error del centro al marcar' };

  it('revoca una sanción vigente con escritura condicional', async () => {
    mockPrisma.clientSanction.findUnique.mockResolvedValue({
      id: SANCTION_ID,
      userId: 'user-1',
      revokedAt: null,
    } as never);
    mockPrisma.clientSanction.updateMany.mockResolvedValue({ count: 1 });

    const result = await revokeSanction(input, 'admin-1', NOW);

    expect(result).toEqual({ sanctionId: SANCTION_ID, userId: 'user-1', revokedAt: NOW });
    expect(mockPrisma.clientSanction.updateMany).toHaveBeenCalledWith({
      where: { id: SANCTION_ID, revokedAt: null },
      data: { revokedAt: NOW, revokedBy: 'admin-1', revokeReason: input.reason },
    });
  });

  it('no existe → SanctionNotFoundError', async () => {
    mockPrisma.clientSanction.findUnique.mockResolvedValue(null);
    await expect(revokeSanction(input, 'admin-1', NOW)).rejects.toBeInstanceOf(
      SanctionNotFoundError,
    );
  });

  it('ya revocada → SanctionAlreadyRevokedError', async () => {
    mockPrisma.clientSanction.findUnique.mockResolvedValue({
      id: SANCTION_ID,
      userId: 'user-1',
      revokedAt: NOW,
    } as never);
    await expect(revokeSanction(input, 'admin-1', NOW)).rejects.toBeInstanceOf(
      SanctionAlreadyRevokedError,
    );
    expect(mockPrisma.clientSanction.updateMany).not.toHaveBeenCalled();
  });

  it('revocada en paralelo (0 filas) → SanctionAlreadyRevokedError', async () => {
    mockPrisma.clientSanction.findUnique.mockResolvedValue({
      id: SANCTION_ID,
      userId: 'user-1',
      revokedAt: null,
    } as never);
    mockPrisma.clientSanction.updateMany.mockResolvedValue({ count: 0 });
    await expect(revokeSanction(input, 'admin-1', NOW)).rejects.toBeInstanceOf(
      SanctionAlreadyRevokedError,
    );
  });

  it('motivo demasiado corto → ZodError', async () => {
    await expect(
      revokeSanction({ sanctionId: SANCTION_ID, reason: 'no' }, 'admin-1', NOW),
    ).rejects.toBeInstanceOf(ZodError);
  });
});

describe('sanctionsRepository.activateNoShowSanction', () => {
  const data = { userId: 'user-1', bookingId: 'b-1', occurredAt: NOW };

  it('crea la sanción con ON CONFLICT DO NOTHING', async () => {
    mockPrisma.clientSanction.createMany.mockResolvedValue({ count: 1 });

    await expect(sanctionsRepository.activateNoShowSanction(data)).resolves.toBe(true);
    expect(mockPrisma.clientSanction.createMany).toHaveBeenCalledWith({
      data: [{ ...data, reason: 'no_show' }],
      skipDuplicates: true,
    });
    expect(mockPrisma.clientSanction.updateMany).not.toHaveBeenCalled();
  });

  it('si ya existía vigente, no duplica ni cambia nada', async () => {
    mockPrisma.clientSanction.createMany.mockResolvedValue({ count: 0 });
    mockPrisma.clientSanction.updateMany.mockResolvedValue({ count: 0 });

    await expect(sanctionsRepository.activateNoShowSanction(data)).resolves.toBe(false);
  });

  it('si existía revocada (deshacer y volver a marcar), la reactiva', async () => {
    mockPrisma.clientSanction.createMany.mockResolvedValue({ count: 0 });
    mockPrisma.clientSanction.updateMany.mockResolvedValue({ count: 1 });

    await expect(sanctionsRepository.activateNoShowSanction(data)).resolves.toBe(true);
    expect(mockPrisma.clientSanction.updateMany.mock.calls[0][0]?.where).toEqual({
      bookingId: 'b-1',
      revokedAt: { not: null },
    });
  });
});

describe('listActiveSanctionsForSupport', () => {
  const supportRow = {
    id: SANCTION_ID,
    bookingId: 'bk-1',
    occurredAt: NOW,
    createdAt: NOW,
    user: { email: 'ana@yaiwell.com', fullName: '  ' },
    booking: { provider: { businessName: 'Studio Aura' }, service: { name: { es: 'Corte' } } },
  };

  it('filtra por email (contiene, sin mayúsculas) y aplana la fila', async () => {
    mockPrisma.clientSanction.findMany.mockResolvedValue([supportRow] as never);

    const result = await listActiveSanctionsForSupport({ email: '  Ana@ ' });

    const args = mockPrisma.clientSanction.findMany.mock.calls[0][0];
    expect(args?.where).toEqual({
      revokedAt: null,
      user: { email: { contains: 'Ana@', mode: 'insensitive' } },
    });
    expect(result).toEqual([
      {
        id: SANCTION_ID,
        bookingId: 'bk-1',
        occurredAt: NOW,
        createdAt: NOW,
        clientEmail: 'ana@yaiwell.com',
        clientName: null,
        providerName: 'Studio Aura',
        serviceName: { es: 'Corte' },
      },
    ]);
  });

  it('sin filtro (o vacío) lista todas las vigentes', async () => {
    mockPrisma.clientSanction.findMany.mockResolvedValue([]);
    await listActiveSanctionsForSupport({ email: '' });
    expect(mockPrisma.clientSanction.findMany.mock.calls[0][0]?.where).toEqual({ revokedAt: null });
  });
});
