/**
 * Tests del servicio user (sincronización desde Clerk).
 *
 * Mockeamos el singleton Prisma para no tocar BD. Cubrimos:
 *  - normalizeClerkUser: email primario, fallback verificado, rol por
 *    cadena public→unsafe→default, locale válido vs inválido, nombre
 *    completo compuesto, avatar vacío.
 *  - syncUserFromClerk: upsert con los datos normalizados.
 *  - deleteUserFromClerk: soft delete OK, idempotencia cuando no existe.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    user: {
      upsert: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

import { prisma } from '@/lib/db/prisma';

import {
  deleteUserFromClerk,
  MissingPrimaryEmailError,
  normalizeClerkUser,
  syncUserFromClerk,
  UserNotFoundError,
} from './index';

/**
 * Construye un `UserJSON` mínimo válido para los tests. Solo rellenamos
 * los campos que el servicio lee; el cast a `any` evita inflar el test
 * con propiedades que no afectan al resultado.
 */
function buildClerkUser(overrides: Record<string, unknown> = {}) {
  return {
    id: 'user_abc',
    email_addresses: [
      {
        id: 'email_1',
        email_address: 'jorge@yaiwell.com',
        verification: { status: 'verified' },
      },
    ],
    primary_email_address_id: 'email_1',
    first_name: 'Jorge',
    last_name: 'Graells',
    image_url: 'https://img.clerk.com/u/abc',
    public_metadata: {},
    unsafe_metadata: {},
    ...overrides,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
}

describe('normalizeClerkUser', () => {
  it('resuelve email primario, rol client por defecto y locale es', () => {
    const result = normalizeClerkUser(buildClerkUser());
    expect(result).toEqual({
      clerkId: 'user_abc',
      email: 'jorge@yaiwell.com',
      role: 'client',
      locale: 'es',
      fullName: 'Jorge Graells',
      avatarUrl: 'https://img.clerk.com/u/abc',
    });
  });

  it('prefiere publicMetadata.role sobre unsafeMetadata.role', () => {
    const result = normalizeClerkUser(
      buildClerkUser({
        public_metadata: { role: 'provider' },
        unsafe_metadata: { role: 'admin' },
      }),
    );
    expect(result.role).toBe('provider');
  });

  it('cae a unsafeMetadata.role cuando publicMetadata no tiene rol válido', () => {
    const result = normalizeClerkUser(
      buildClerkUser({
        public_metadata: {},
        unsafe_metadata: { role: 'provider' },
      }),
    );
    expect(result.role).toBe('provider');
  });

  it('ignora roles inválidos y cae a client', () => {
    const result = normalizeClerkUser(
      buildClerkUser({
        public_metadata: { role: 'superuser' },
        unsafe_metadata: { role: 'hacker' },
      }),
    );
    expect(result.role).toBe('client');
  });

  it('acepta locale ca y cae a es para valores no soportados', () => {
    expect(normalizeClerkUser(buildClerkUser({ unsafe_metadata: { locale: 'ca' } })).locale).toBe(
      'ca',
    );
    expect(normalizeClerkUser(buildClerkUser({ unsafe_metadata: { locale: 'en' } })).locale).toBe(
      'es',
    );
  });

  it('lanza MissingPrimaryEmailError cuando no hay emails', () => {
    expect(() => normalizeClerkUser(buildClerkUser({ email_addresses: [] }))).toThrow(
      MissingPrimaryEmailError,
    );
  });

  it('usa el primer email verificado si primary_email_address_id no matchea', () => {
    const result = normalizeClerkUser(
      buildClerkUser({
        primary_email_address_id: 'email_404',
        email_addresses: [
          { id: 'email_1', email_address: 'no@verif.com', verification: { status: 'unverified' } },
          { id: 'email_2', email_address: 'si@verif.com', verification: { status: 'verified' } },
        ],
      }),
    );
    expect(result.email).toBe('si@verif.com');
  });

  it('devuelve fullName null cuando first y last están vacíos', () => {
    const result = normalizeClerkUser(buildClerkUser({ first_name: '', last_name: '' }));
    expect(result.fullName).toBeNull();
  });

  it('devuelve avatarUrl null cuando image_url está vacío', () => {
    const result = normalizeClerkUser(buildClerkUser({ image_url: '' }));
    expect(result.avatarUrl).toBeNull();
  });
});

describe('syncUserFromClerk', () => {
  beforeEach(() => {
    vi.mocked(prisma.user.upsert).mockReset();
  });

  it('hace upsert con los campos normalizados', async () => {
    vi.mocked(prisma.user.upsert).mockResolvedValue({ id: 'db-uuid' } as never);

    await syncUserFromClerk(buildClerkUser({ public_metadata: { role: 'admin' } }));

    expect(prisma.user.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { clerkId: 'user_abc' },
        create: expect.objectContaining({ role: 'admin', email: 'jorge@yaiwell.com' }),
        update: expect.objectContaining({ role: 'admin', deletedAt: null }),
      }),
    );
  });
});

describe('deleteUserFromClerk', () => {
  beforeEach(() => {
    vi.mocked(prisma.user.findUnique).mockReset();
    vi.mocked(prisma.user.update).mockReset();
  });

  it('soft delete cuando el usuario existe', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: 'db-uuid',
      clerkId: 'user_abc',
    } as never);
    vi.mocked(prisma.user.update).mockResolvedValue({
      id: 'db-uuid',
      deletedAt: new Date(),
    } as never);

    await deleteUserFromClerk({ id: 'user_abc' } as never);

    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { clerkId: 'user_abc' },
        data: { deletedAt: expect.any(Date) },
      }),
    );
  });

  it('lanza UserNotFoundError si el usuario no existe', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
    await expect(deleteUserFromClerk({ id: 'user_404' } as never)).rejects.toBeInstanceOf(
      UserNotFoundError,
    );
  });

  it('lanza UserNotFoundError si el payload no incluye id', async () => {
    await expect(deleteUserFromClerk({ id: undefined } as never)).rejects.toBeInstanceOf(
      UserNotFoundError,
    );
  });
});
