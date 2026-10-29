import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Tests de `becomeProviderAction` (y de `convertClientToProvider`, que
 * se ejecuta de verdad: solo se mockean Clerk y la BD).
 *
 * Fijan el contrato del borde: locale validado, sesión obligatoria, el
 * admin nunca se convierte, el profesional no se toca, el cliente pasa
 * a `publicMetadata.role = 'provider'` con su plan como preferencia de
 * UI, un plan inválido se ignora y `users.role` se sincroniza al
 * momento con el usuario que devuelve Clerk.
 */

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  getUser: vi.fn(),
  updateUserMetadata: vi.fn(),
  syncUserFromBackendUser: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock('@clerk/nextjs/server', () => ({
  auth: mocks.auth,
  clerkClient: vi.fn().mockResolvedValue({
    users: { getUser: mocks.getUser, updateUserMetadata: mocks.updateUserMetadata },
  }),
}));
vi.mock('next/cache', () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock('@/lib/services/user', () => ({
  syncUserFromBackendUser: mocks.syncUserFromBackendUser,
}));

import { becomeProviderAction } from './actions';

/** Usuario de Clerk mínimo con los metadatos que lee el rol. */
function clerkUser(publicRole?: string, unsafe: Record<string, unknown> = {}) {
  return {
    id: 'user_1',
    publicMetadata: publicRole ? { role: publicRole } : {},
    unsafeMetadata: unsafe,
  };
}

describe('becomeProviderAction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.auth.mockResolvedValue({ userId: 'user_1' });
    mocks.getUser.mockResolvedValue(clerkUser('client'));
    mocks.updateUserMetadata.mockResolvedValue(clerkUser('provider'));
    mocks.syncUserFromBackendUser.mockResolvedValue({ id: 'db_1' });
  });

  it('rechaza un locale inválido sin tocar Clerk', async () => {
    await expect(becomeProviderAction('fr', 'pro')).resolves.toEqual({
      status: 'invalid-input',
    });
    expect(mocks.auth).not.toHaveBeenCalled();
    expect(mocks.updateUserMetadata).not.toHaveBeenCalled();
  });

  it('sin sesión devuelve unauthenticated', async () => {
    mocks.auth.mockResolvedValue({ userId: null });
    await expect(becomeProviderAction('es')).resolves.toEqual({ status: 'unauthenticated' });
    expect(mocks.getUser).not.toHaveBeenCalled();
  });

  it('un admin nunca se convierte', async () => {
    mocks.getUser.mockResolvedValue(clerkUser('admin'));
    await expect(becomeProviderAction('es')).resolves.toEqual({ status: 'forbidden' });
    expect(mocks.updateUserMetadata).not.toHaveBeenCalled();
    expect(mocks.syncUserFromBackendUser).not.toHaveBeenCalled();
  });

  it('un admin escrito en unsafeMetadata no cuenta como admin: es cliente y se convierte', async () => {
    mocks.getUser.mockResolvedValue(clerkUser(undefined, { role: 'admin' }));
    await expect(becomeProviderAction('es')).resolves.toEqual({ status: 'converted' });
  });

  it('un profesional no se toca', async () => {
    mocks.getUser.mockResolvedValue(clerkUser('provider'));
    await expect(becomeProviderAction('es', 'pro')).resolves.toEqual({
      status: 'already-provider',
    });
    expect(mocks.updateUserMetadata).not.toHaveBeenCalled();
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });

  it('un cliente pasa a provider en publicMetadata con su plan como preferencia', async () => {
    await expect(becomeProviderAction('ca', 'pro')).resolves.toEqual({ status: 'converted' });
    expect(mocks.updateUserMetadata).toHaveBeenCalledWith('user_1', {
      publicMetadata: { role: 'provider' },
      unsafeMetadata: { selectedPlan: 'pro' },
    });
    // La BD se sincroniza con el usuario devuelto por Clerk, no con el viejo.
    expect(mocks.syncUserFromBackendUser).toHaveBeenCalledWith(clerkUser('provider'));
    expect(mocks.revalidatePath).toHaveBeenCalledWith('/ca', 'layout');
  });

  it('un cliente sin plan se convierte sin tocar unsafeMetadata', async () => {
    await becomeProviderAction('es');
    expect(mocks.updateUserMetadata).toHaveBeenCalledWith('user_1', {
      publicMetadata: { role: 'provider' },
    });
  });

  it.each([['vip'], ['PRO'], [42], [['pro', 'basic']]])(
    'ignora el plan inválido %j y convierte igualmente',
    async (plan) => {
      await expect(becomeProviderAction('es', plan)).resolves.toEqual({ status: 'converted' });
      expect(mocks.updateUserMetadata).toHaveBeenCalledWith('user_1', {
        publicMetadata: { role: 'provider' },
      });
    },
  );

  it('si falla la BD tras escribir en Clerk devuelve converted (Clerk manda)', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    mocks.syncUserFromBackendUser.mockRejectedValue(new Error('db down'));
    await expect(becomeProviderAction('es')).resolves.toEqual({ status: 'converted' });
    expect(consoleError).toHaveBeenCalled();
    consoleError.mockRestore();
  });

  it('si Clerk falla devuelve error y no sincroniza la BD', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    mocks.updateUserMetadata.mockRejectedValue(new Error('clerk down'));
    await expect(becomeProviderAction('es')).resolves.toEqual({ status: 'error' });
    expect(mocks.syncUserFromBackendUser).not.toHaveBeenCalled();
    consoleError.mockRestore();
  });
});
