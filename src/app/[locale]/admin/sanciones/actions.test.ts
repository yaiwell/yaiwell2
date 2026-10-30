/**
 * Tests de la server action con la que soporte revoca sanciones por no
 * presentado (/admin/sanciones): solo admin, motivo obligatorio validado
 * en el borde, auditoría con el `User.id` interno y errores tipados.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

const { requireRoleMock, revokeMock, revalidatePathMock, ensureUserMock, errors } = vi.hoisted(
  () => {
    class SanctionNotFoundError extends Error {}
    class SanctionAlreadyRevokedError extends Error {}
    return {
      requireRoleMock: vi.fn(),
      revokeMock: vi.fn(),
      revalidatePathMock: vi.fn(),
      ensureUserMock: vi.fn(),
      errors: { SanctionNotFoundError, SanctionAlreadyRevokedError },
    };
  },
);

vi.mock('next/cache', () => ({ revalidatePath: revalidatePathMock }));
vi.mock('@/lib/auth/server', () => ({ requireRole: requireRoleMock }));
vi.mock('@/lib/services/user', () => ({ ensureUserFromClerk: ensureUserMock }));
vi.mock('@/lib/services/sanctions', async () => {
  // Schema real: lo que se prueba es la validación en el borde.
  const validation = await import('@/lib/services/sanctions/sanctions.validation');
  return {
    revokeSanction: revokeMock,
    revokeSanctionSchema: validation.revokeSanctionSchema,
    ...errors,
  };
});

import { revokeSanctionAction } from './actions';

const SANCTION_ID = '6f1c2b8e-1d2a-4c3b-9e4f-5a6b7c8d9e0f';
const REASON = 'El cliente avisó por teléfono y el centro lo confirma';

describe('revokeSanctionAction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    requireRoleMock.mockResolvedValue({ userId: 'clerk_admin', role: 'admin' });
    ensureUserMock.mockResolvedValue({ id: 'admin-user-1' });
    revokeMock.mockResolvedValue({ sanctionId: SANCTION_ID, userId: 'u', revokedAt: new Date() });
  });

  it('revoca con el User.id interno del admin y revalida la pantalla', async () => {
    expect(await revokeSanctionAction('es', SANCTION_ID, REASON)).toEqual({ ok: true });
    expect(revokeMock).toHaveBeenCalledWith(
      { sanctionId: SANCTION_ID, reason: REASON },
      'admin-user-1',
    );
    expect(revalidatePathMock).toHaveBeenCalledWith('/es/admin/sanciones');
  });

  it('rechaza a un no admin sin tocar BD', async () => {
    requireRoleMock.mockRejectedValue(new Error('NEXT_REDIRECT'));
    expect(await revokeSanctionAction('es', SANCTION_ID, REASON)).toEqual({
      ok: false,
      code: 'FORBIDDEN',
    });
    expect(revokeMock).not.toHaveBeenCalled();
  });

  it('motivo vacío o corto → INVALID_REASON sin tocar BD', async () => {
    expect(await revokeSanctionAction('es', SANCTION_ID, '   ')).toEqual({
      ok: false,
      code: 'INVALID_REASON',
    });
    expect(await revokeSanctionAction('es', SANCTION_ID, 'ok')).toMatchObject({
      code: 'INVALID_REASON',
    });
    expect(revokeMock).not.toHaveBeenCalled();
  });

  it('id inválido o locale desconocido → VALIDATION', async () => {
    expect(await revokeSanctionAction('es', 'x', REASON)).toEqual({
      ok: false,
      code: 'VALIDATION',
    });
    expect(await revokeSanctionAction('fr' as never, SANCTION_ID, REASON)).toEqual({
      ok: false,
      code: 'VALIDATION',
    });
  });

  it.each([
    ['SanctionNotFoundError', 'NOT_FOUND'],
    ['SanctionAlreadyRevokedError', 'ALREADY_REVOKED'],
  ] as const)('%s → %s', async (name, code) => {
    revokeMock.mockRejectedValue(new errors[name]());
    expect(await revokeSanctionAction('es', SANCTION_ID, REASON)).toEqual({ ok: false, code });
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });

  it('un error inesperado → INTERNAL', async () => {
    revokeMock.mockRejectedValue(new Error('db down'));
    expect(await revokeSanctionAction('es', SANCTION_ID, REASON)).toEqual({
      ok: false,
      code: 'INTERNAL',
    });
  });
});
