/**
 * Tests de `syncUserFromClerkById`, la sincronización que usa el webhook.
 *
 * Lo importante: el rol que acaba en BD es el que Clerk tiene **ahora**,
 * no el del evento. Así un `user.updated` antiguo con `role=client` que
 * llega tras convertir la cuenta en profesional no la deshace.
 */

import { ClerkAPIResponseError } from '@clerk/nextjs/errors';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  upsert: vi.fn(),
  findUnique: vi.fn(),
}));

vi.mock('@clerk/nextjs/server', () => ({
  clerkClient: vi.fn().mockResolvedValue({ users: { getUser: mocks.getUser } }),
}));
vi.mock('@/lib/db/prisma', () => ({
  prisma: { user: { upsert: mocks.upsert, findUnique: mocks.findUnique, update: vi.fn() } },
}));

import { syncUserFromClerkById, UserNotFoundError } from './index';

/** Usuario de la API REST de Clerk (camelCase) con el rol indicado. */
function backendUser(role: string) {
  return {
    id: 'user_1',
    emailAddresses: [
      { id: 'em_1', emailAddress: 'pro@yaiwell.com', verification: { status: 'verified' } },
    ],
    primaryEmailAddressId: 'em_1',
    firstName: 'Ana',
    lastName: null,
    imageUrl: '',
    publicMetadata: { role },
    unsafeMetadata: { role: 'client' },
  };
}

describe('syncUserFromClerkById', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Fila existente con el mismo clerkId: no hay reenlace por email.
    mocks.findUnique.mockResolvedValue({ id: 'db_1' });
    mocks.upsert.mockResolvedValue({ id: 'db_1' });
  });

  it('escribe el rol actual de Clerk aunque el evento que lo dispara sea antiguo', async () => {
    // Clerk ya tiene la cuenta convertida; el evento traía `client`.
    mocks.getUser.mockResolvedValue(backendUser('provider'));

    await syncUserFromClerkById('user_1');

    expect(mocks.getUser).toHaveBeenCalledWith('user_1');
    const args = mocks.upsert.mock.calls[0]?.[0];
    expect(args.update.role).toBe('provider');
    expect(args.create.role).toBe('provider');
  });

  it('si Clerk responde 404 lanza UserNotFoundError y no toca la BD', async () => {
    mocks.getUser.mockRejectedValue(
      new ClerkAPIResponseError('Not Found', { data: [], status: 404 }),
    );

    await expect(syncUserFromClerkById('user_gone')).rejects.toBeInstanceOf(UserNotFoundError);
    expect(mocks.upsert).not.toHaveBeenCalled();
  });

  it('otros fallos de Clerk se propagan (el webhook responde 500 y Clerk reintenta)', async () => {
    mocks.getUser.mockRejectedValue(new Error('network'));
    await expect(syncUserFromClerkById('user_1')).rejects.toThrow('network');
  });
});
