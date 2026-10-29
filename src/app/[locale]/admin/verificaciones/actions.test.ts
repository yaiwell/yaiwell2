/**
 * Tests de las acciones de verificación: solo se programa el correo al
 * negocio cuando la decisión se guardó, y con el id de esa decisión.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => {
  class ProviderNotFoundForVerificationError extends Error {}
  class InvalidVerificationStatusError extends Error {}
  class RejectionNotesRequiredError extends Error {}
  class MissingPrimaryEmailError extends Error {}
  return {
    errors: {
      ProviderNotFoundForVerificationError,
      InvalidVerificationStatusError,
      RejectionNotesRequiredError,
    },
    MissingPrimaryEmailError,
    requireRole: vi.fn(),
    ensureUserFromClerk: vi.fn(),
    approveProvider: vi.fn(),
    rejectProvider: vi.fn(),
    redirect: vi.fn(),
    scheduleNotification: vi.fn((task: () => Promise<void>) => void task()),
    notifyProviderApproved: vi.fn(async () => {}),
    notifyProviderRejected: vi.fn(async () => {}),
  };
});

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('next/navigation', () => ({ redirect: mocks.redirect }));
vi.mock('@/lib/auth/server', () => ({ requireRole: mocks.requireRole }));
vi.mock('@/lib/services/user', () => ({
  ensureUserFromClerk: mocks.ensureUserFromClerk,
  MissingPrimaryEmailError: mocks.MissingPrimaryEmailError,
}));
vi.mock('@/lib/services/verification', () => ({
  ...mocks.errors,
  approveProvider: mocks.approveProvider,
  rejectProvider: mocks.rejectProvider,
}));
vi.mock('@/lib/services/notifications', () => ({
  scheduleNotification: mocks.scheduleNotification,
  notifyProviderApproved: mocks.notifyProviderApproved,
  notifyProviderRejected: mocks.notifyProviderRejected,
}));

import { approveProviderAction, rejectProviderAction } from './actions';

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, 'error').mockImplementation(() => {});
  mocks.requireRole.mockResolvedValue({ userId: 'clerk-admin' });
  mocks.ensureUserFromClerk.mockResolvedValue({ id: 'admin-1' });
});

describe('approveProviderAction', () => {
  it('avisa al negocio con el id de la decisión', async () => {
    mocks.approveProvider.mockResolvedValue('vr-1');
    await approveProviderAction('es', 'prov-1');
    expect(mocks.notifyProviderApproved).toHaveBeenCalledWith('prov-1', 'vr-1');
    expect(mocks.redirect).toHaveBeenCalledWith('/es/admin');
  });

  it('no envía nada si el negocio no existe', async () => {
    mocks.approveProvider.mockRejectedValue(
      new mocks.errors.ProviderNotFoundForVerificationError(),
    );
    expect(await approveProviderAction('es', 'prov-1')).toEqual({
      ok: false,
      code: 'PROVIDER_NOT_FOUND',
    });
    expect(mocks.scheduleNotification).not.toHaveBeenCalled();
  });

  it('no envía nada sin sesión de admin', async () => {
    mocks.requireRole.mockRejectedValue(new Error('NEXT_REDIRECT'));
    expect(await approveProviderAction('es', 'prov-1')).toMatchObject({ code: 'FORBIDDEN' });
    expect(mocks.approveProvider).not.toHaveBeenCalled();
    expect(mocks.scheduleNotification).not.toHaveBeenCalled();
  });
});

describe('decisión repetida', () => {
  it('un doble clic en aprobar no manda un segundo correo', async () => {
    mocks.approveProvider.mockResolvedValue(null);
    await approveProviderAction('es', 'prov-1');
    expect(mocks.scheduleNotification).not.toHaveBeenCalled();
    expect(mocks.redirect).toHaveBeenCalledWith('/es/admin');
  });
});

describe('rejectProviderAction', () => {
  it('avisa con el motivo sin espacios sobrantes', async () => {
    mocks.rejectProvider.mockResolvedValue('vr-2');
    await rejectProviderAction('es', 'prov-1', '  Falta el CIF  ');
    expect(mocks.notifyProviderRejected).toHaveBeenCalledWith('prov-1', 'vr-2', 'Falta el CIF');
  });

  it('un rechazo sin motivo válido no programa correo', async () => {
    mocks.rejectProvider.mockRejectedValue(new mocks.errors.RejectionNotesRequiredError());
    expect(await rejectProviderAction('es', 'prov-1', 'ok')).toEqual({
      ok: false,
      code: 'NOTES_REQUIRED',
    });
    expect(mocks.scheduleNotification).not.toHaveBeenCalled();
  });
});
