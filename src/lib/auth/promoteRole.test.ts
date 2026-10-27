/**
 * Tests de `promoteRoleToPublicMetadata`.
 *
 * Mockeamos `@clerk/nextjs/server` para capturar la llamada a
 * `updateUserMetadata` sin tocar Clerk de verdad.
 *
 * Cubrimos:
 *  - Promoción cuando publicMetadata está vacío y unsafe tiene rol válido.
 *  - No-op cuando publicMetadata ya tiene rol válido (idempotencia, no
 *    sobrescribimos lo "oficial" con un unsafe potencialmente desactualizado).
 *  - No-op cuando unsafe no tiene rol válido.
 *  - Ignora valores no soportados (string vacío, número, role inventado).
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

const { updateUserMetadataMock, getUserMock, clerkClientMock } = vi.hoisted(() => {
  const updateUserMetadataMock = vi.fn().mockResolvedValue({});
  const getUserMock = vi.fn().mockResolvedValue({ publicMetadata: {} });
  const clerkClientMock = vi.fn().mockResolvedValue({
    users: { updateUserMetadata: updateUserMetadataMock, getUser: getUserMock },
  });
  return { updateUserMetadataMock, getUserMock, clerkClientMock };
});

vi.mock('@clerk/nextjs/server', () => ({
  clerkClient: clerkClientMock,
}));

import { promoteRoleToPublicMetadata } from './promoteRole';

/**
 * Construye un `UserJSON` mínimo con los campos que la función lee.
 * Cast a any para no inflar el test con campos irrelevantes.
 */
function buildPayload(overrides: Record<string, unknown> = {}) {
  return {
    id: 'user_test',
    public_metadata: {},
    unsafe_metadata: {},
    ...overrides,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
}

describe('promoteRoleToPublicMetadata', () => {
  beforeEach(() => {
    updateUserMetadataMock.mockClear();
    getUserMock.mockClear().mockResolvedValue({ publicMetadata: {} });
    clerkClientMock.mockClear();
  });

  it('no pisa un rol público puesto después del alta (reintento del webhook)', async () => {
    getUserMock.mockResolvedValueOnce({ publicMetadata: { role: 'admin' } });

    const result = await promoteRoleToPublicMetadata(
      buildPayload({ unsafe_metadata: { role: 'client' } }),
    );

    expect(result).toBeNull();
    expect(updateUserMetadataMock).not.toHaveBeenCalled();
  });

  it('promueve cuando publicMetadata está vacío y unsafe tiene provider', async () => {
    const result = await promoteRoleToPublicMetadata(
      buildPayload({ unsafe_metadata: { role: 'provider' } }),
    );

    expect(result).toBe('provider');
    expect(updateUserMetadataMock).toHaveBeenCalledWith('user_test', {
      publicMetadata: { role: 'provider' },
    });
  });

  it('no toca nada cuando publicMetadata ya tiene rol válido', async () => {
    const result = await promoteRoleToPublicMetadata(
      buildPayload({
        public_metadata: { role: 'client' },
        unsafe_metadata: { role: 'provider' },
      }),
    );

    expect(result).toBeNull();
    expect(updateUserMetadataMock).not.toHaveBeenCalled();
  });

  it('sin rol en unsafe fija client para que la cuenta no quede sin rol oficial', async () => {
    const result = await promoteRoleToPublicMetadata(
      buildPayload({ unsafe_metadata: { foo: 'bar' } }),
    );

    expect(result).toBe('client');
    expect(updateUserMetadataMock).toHaveBeenCalledWith('user_test', {
      publicMetadata: { role: 'client' },
    });
  });

  it('valores no soportados (superuser, string vacío, número) acaban en client', async () => {
    for (const role of ['superuser', '', 42]) {
      await promoteRoleToPublicMetadata(buildPayload({ unsafe_metadata: { role } }));
    }

    expect(updateUserMetadataMock).toHaveBeenCalledTimes(3);
    for (const call of updateUserMetadataMock.mock.calls) {
      expect(call[1]).toEqual({ publicMetadata: { role: 'client' } });
    }
  });

  it('nunca promociona admin desde unsafeMetadata (lo escribe el propio usuario)', async () => {
    const result = await promoteRoleToPublicMetadata(
      buildPayload({ unsafe_metadata: { role: 'admin' } }),
    );

    expect(result).toBe('client');
    expect(updateUserMetadataMock).toHaveBeenCalledWith('user_test', {
      publicMetadata: { role: 'client' },
    });
  });
});
