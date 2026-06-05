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

const { updateUserMetadataMock, clerkClientMock } = vi.hoisted(() => {
  const updateUserMetadataMock = vi.fn().mockResolvedValue({});
  const clerkClientMock = vi.fn().mockResolvedValue({
    users: { updateUserMetadata: updateUserMetadataMock },
  });
  return { updateUserMetadataMock, clerkClientMock };
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
    clerkClientMock.mockClear();
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

  it('no toca nada cuando unsafe no tiene rol válido', async () => {
    const result = await promoteRoleToPublicMetadata(
      buildPayload({ unsafe_metadata: { foo: 'bar' } }),
    );

    expect(result).toBeNull();
    expect(updateUserMetadataMock).not.toHaveBeenCalled();
  });

  it('ignora valores no soportados (superuser, string vacío, número)', async () => {
    await promoteRoleToPublicMetadata(buildPayload({ unsafe_metadata: { role: 'superuser' } }));
    await promoteRoleToPublicMetadata(buildPayload({ unsafe_metadata: { role: '' } }));
    await promoteRoleToPublicMetadata(buildPayload({ unsafe_metadata: { role: 42 } }));

    expect(updateUserMetadataMock).not.toHaveBeenCalled();
  });

  it('acepta admin como rol promocionable', async () => {
    const result = await promoteRoleToPublicMetadata(
      buildPayload({ unsafe_metadata: { role: 'admin' } }),
    );

    expect(result).toBe('admin');
    expect(updateUserMetadataMock).toHaveBeenCalledWith('user_test', {
      publicMetadata: { role: 'admin' },
    });
  });
});
