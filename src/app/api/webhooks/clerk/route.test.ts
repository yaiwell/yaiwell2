/**
 * Tests del Route Handler `/api/webhooks/clerk`.
 *
 * Mockeamos:
 *  - `svix` para controlar el resultado de la verificación de firma
 *    sin necesidad de generar firmas válidas en cada test.
 *  - `@/lib/services/user` para verificar que se llama al método
 *    correcto según el tipo de evento.
 *
 * Cubrimos:
 *  - 501 cuando falta `CLERK_WEBHOOK_SECRET`.
 *  - 400 cuando faltan headers svix.
 *  - 400 cuando la firma no verifica.
 *  - 200 + sync en user.created y user.updated.
 *  - 200 + soft delete en user.deleted.
 *  - 200 + ignored en eventos no manejados.
 *  - 200 + skipped cuando user.deleted no encuentra al usuario.
 *  - 500 cuando el servicio lanza un error inesperado.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// `vi.mock` se hoistea por encima de los imports, así que las refs a
// mocks deben ir dentro de `vi.hoisted` para estar disponibles en la
// fábrica del mock sin un ReferenceError.
const {
  verifyMock,
  syncUserMock,
  deleteUserMock,
  promoteRoleMock,
  MissingPrimaryEmailErrorStub,
  UserNotFoundErrorStub,
} = vi.hoisted(() => {
  class MissingPrimaryEmailErrorStub extends Error {
    readonly code = 'MISSING_PRIMARY_EMAIL';
  }
  class UserNotFoundErrorStub extends Error {
    readonly code = 'USER_NOT_FOUND';
  }
  return {
    verifyMock: vi.fn(),
    syncUserMock: vi.fn(),
    deleteUserMock: vi.fn(),
    promoteRoleMock: vi.fn().mockResolvedValue(null),
    MissingPrimaryEmailErrorStub,
    UserNotFoundErrorStub,
  };
});

// El mock cubre tanto el named export `Webhook` como el `default`,
// porque svix es CJS y la interop puede resolver por cualquiera de
// los dos según el resolver. Usamos una clase real para que `new Webhook()`
// devuelva siempre una instancia con `verify`, en lugar de depender de
// la semántica de `vi.fn().mockImplementation` con `new`.
vi.mock('svix', () => {
  class Webhook {
    verify = verifyMock;
  }
  return { Webhook, default: { Webhook } };
});

vi.mock('@/lib/services/user', () => ({
  syncUserFromClerk: syncUserMock,
  deleteUserFromClerk: deleteUserMock,
  MissingPrimaryEmailError: MissingPrimaryEmailErrorStub,
  UserNotFoundError: UserNotFoundErrorStub,
}));

vi.mock('@/lib/auth', () => ({
  promoteRoleToPublicMetadata: promoteRoleMock,
}));

import { POST } from './route';

/**
 * Construye un `NextRequest` mínimo con los headers svix y un body
 * JSON. Para tests donde la firma se mockea, el body puede ser cualquier
 * JSON serializable.
 */
function buildRequest(options: { headers?: Record<string, string>; body?: unknown }) {
  const headers = new Headers({
    'svix-id': 'msg_test',
    'svix-timestamp': '1700000000',
    'svix-signature': 'v1,fake',
    ...(options.headers ?? {}),
  });
  return {
    headers: {
      get: (key: string) => headers.get(key),
    },
    text: async () => JSON.stringify(options.body ?? {}),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
}

describe('POST /api/webhooks/clerk', () => {
  const ORIGINAL_SECRET = process.env.CLERK_WEBHOOK_SECRET;

  beforeEach(() => {
    process.env.CLERK_WEBHOOK_SECRET = 'whsec_test';
    verifyMock.mockReset();
    syncUserMock.mockReset();
    deleteUserMock.mockReset();
    promoteRoleMock.mockReset().mockResolvedValue(null);
  });

  afterEach(() => {
    process.env.CLERK_WEBHOOK_SECRET = ORIGINAL_SECRET;
  });

  it('501 cuando falta el secret', async () => {
    delete process.env.CLERK_WEBHOOK_SECRET;
    const res = await POST(buildRequest({}));
    expect(res.status).toBe(501);
  });

  it('400 cuando faltan headers svix', async () => {
    const res = await POST(
      buildRequest({
        headers: { 'svix-id': '', 'svix-timestamp': '', 'svix-signature': '' },
      }),
    );
    expect(res.status).toBe(400);
  });

  it('400 cuando la firma no verifica', async () => {
    verifyMock.mockImplementation(() => {
      throw new Error('invalid signature');
    });
    const res = await POST(buildRequest({ body: { type: 'user.created' } }));
    expect(res.status).toBe(400);
    expect(syncUserMock).not.toHaveBeenCalled();
  });

  it('200 + sync + promoción de rol en user.created', async () => {
    verifyMock.mockImplementation(() => ({ type: 'user.created', data: { id: 'user_1' } }));
    syncUserMock.mockResolvedValue({ id: 'db_1' });

    const res = await POST(buildRequest({ body: {} }));

    expect(res.status).toBe(200);
    expect(promoteRoleMock).toHaveBeenCalledWith({ id: 'user_1' });
    expect(syncUserMock).toHaveBeenCalledWith({ id: 'user_1' });
    expect(deleteUserMock).not.toHaveBeenCalled();
  });

  it('200 + sync (sin promoción) en user.updated', async () => {
    verifyMock.mockImplementation(() => ({ type: 'user.updated', data: { id: 'user_1' } }));
    syncUserMock.mockResolvedValue({ id: 'db_1' });

    const res = await POST(buildRequest({ body: {} }));

    expect(res.status).toBe(200);
    expect(syncUserMock).toHaveBeenCalledWith({ id: 'user_1' });
    // En user.updated NO promovemos: respetamos el publicMetadata actual.
    expect(promoteRoleMock).not.toHaveBeenCalled();
  });

  it('200 + soft delete en user.deleted', async () => {
    verifyMock.mockImplementation(() => ({ type: 'user.deleted', data: { id: 'user_1' } }));
    deleteUserMock.mockResolvedValue({ id: 'db_1' });

    const res = await POST(buildRequest({ body: {} }));

    expect(res.status).toBe(200);
    expect(deleteUserMock).toHaveBeenCalledWith({ id: 'user_1' });
  });

  it('200 + ignored en eventos no manejados', async () => {
    verifyMock.mockImplementation(() => ({ type: 'session.created', data: {} }));
    const res = await POST(buildRequest({ body: {} }));
    expect(res.status).toBe(200);
    expect(syncUserMock).not.toHaveBeenCalled();
    expect(deleteUserMock).not.toHaveBeenCalled();
  });

  it('200 + skipped cuando user.deleted no encuentra al usuario', async () => {
    verifyMock.mockImplementation(() => ({ type: 'user.deleted', data: { id: 'user_404' } }));
    deleteUserMock.mockRejectedValue(new UserNotFoundErrorStub());

    const res = await POST(buildRequest({ body: {} }));

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.skipped).toBe('USER_NOT_FOUND');
  });

  it('200 + skipped cuando falta email primario', async () => {
    verifyMock.mockImplementation(() => ({ type: 'user.created', data: { id: 'user_1' } }));
    syncUserMock.mockRejectedValue(new MissingPrimaryEmailErrorStub());

    const res = await POST(buildRequest({ body: {} }));

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.skipped).toBe('MISSING_PRIMARY_EMAIL');
  });

  it('500 cuando el servicio lanza un error inesperado', async () => {
    verifyMock.mockImplementation(() => ({ type: 'user.created', data: { id: 'user_1' } }));
    syncUserMock.mockRejectedValue(new Error('db down'));

    const res = await POST(buildRequest({ body: {} }));

    expect(res.status).toBe(500);
  });
});
