/**
 * Tests de la eliminación de cuenta y de la copia de datos.
 *
 * Lo crítico: no borrar a quien tiene un negocio o reservas sin cerrar, y no
 * tocar BD si Clerk no ha eliminado la cuenta.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  deleteUser: vi.fn(),
  ensureUser: vi.fn(),
  anonymize: vi.fn(),
  countOwnedProviders: vi.fn(),
  countOpenBookings: vi.fn(),
  countOpenRefunds: vi.fn(),
  findExportRows: vi.fn(),
}));

vi.mock('@clerk/nextjs/server', () => ({
  clerkClient: async () => ({ users: { deleteUser: mocks.deleteUser } }),
}));
vi.mock('@/lib/services/user', () => ({
  ensureUserFromClerk: mocks.ensureUser,
  userRepository: { anonymizeByClerkId: mocks.anonymize },
}));
vi.mock('./account.repository', () => ({
  accountRepository: {
    countOwnedProviders: mocks.countOwnedProviders,
    countOpenBookings: mocks.countOpenBookings,
    countOpenRefunds: mocks.countOpenRefunds,
    findExportRows: mocks.findExportRows,
  },
}));

import { AccountDeletionBlockedError } from './account.errors';
import { buildAccountExport, deleteOwnAccount } from './account.service';

const USER = {
  id: 'u1',
  email: 'ana@yaiwell.test',
  fullName: 'Ana',
  avatarUrl: null,
  locale: 'es',
  role: 'client',
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.ensureUser.mockResolvedValue(USER);
  mocks.countOwnedProviders.mockResolvedValue(0);
  mocks.countOpenBookings.mockResolvedValue(0);
  mocks.countOpenRefunds.mockResolvedValue(0);
  mocks.deleteUser.mockResolvedValue({});
  mocks.anonymize.mockResolvedValue({});
});

describe('deleteOwnAccount', () => {
  it('elimina en Clerk y después anonimiza', async () => {
    await deleteOwnAccount('clerk_1');

    expect(mocks.deleteUser).toHaveBeenCalledWith('clerk_1');
    expect(mocks.anonymize).toHaveBeenCalledWith('clerk_1');
    expect(mocks.deleteUser.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.anonymize.mock.invocationCallOrder[0],
    );
  });

  it.each([
    ['admin', () => mocks.ensureUser.mockResolvedValue({ ...USER, role: 'admin' })],
    ['provider', () => mocks.countOwnedProviders.mockResolvedValue(1)],
    ['open_bookings', () => mocks.countOpenBookings.mockResolvedValue(1)],
    ['open_refunds', () => mocks.countOpenRefunds.mockResolvedValue(1)],
  ])('bloquea %s sin tocar Clerk ni BD', async (reason, arrange) => {
    arrange();

    const error = await deleteOwnAccount('clerk_1').catch((err: unknown) => err);

    expect(error).toBeInstanceOf(AccountDeletionBlockedError);
    expect((error as AccountDeletionBlockedError).reason).toBe(reason);
    expect(mocks.deleteUser).not.toHaveBeenCalled();
    expect(mocks.anonymize).not.toHaveBeenCalled();
  });

  it('si Clerk falla no anonimiza', async () => {
    mocks.deleteUser.mockRejectedValue(new Error('clerk down'));

    await expect(deleteOwnAccount('clerk_1')).rejects.toThrow('clerk down');
    expect(mocks.anonymize).not.toHaveBeenCalled();
  });

  it('si falla la BD tras Clerk no lanza: el webhook lo reintenta', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    mocks.anonymize.mockRejectedValue(new Error('db down'));

    await expect(deleteOwnAccount('clerk_1')).resolves.toBeUndefined();
  });
});

describe('buildAccountExport', () => {
  it('incluye perfil y reservas, sin identificadores de Stripe', async () => {
    mocks.findExportRows.mockResolvedValue([
      [
        {
          id: 'b1',
          provider: { businessName: 'Studio' },
          service: { name: { es: 'Corte' } },
          professional: { name: 'Lu' },
          status: 'completed',
          priceCents: 2000,
          stripePaymentIntentId: 'pi_secret',
        },
      ],
      [],
      [],
      [],
    ]);

    const data = await buildAccountExport('clerk_1');

    expect(data.profile.email).toBe(USER.email);
    expect(data.bookings[0]).toMatchObject({ id: 'b1', provider: 'Studio', professional: 'Lu' });
    expect(JSON.stringify(data)).not.toContain('pi_secret');
  });
});
