/**
 * Tests del guard `requireRole`.
 *
 * Mockeamos:
 *  - `@clerk/nextjs/server` (auth + currentUser) para controlar el estado
 *    de sesión y el contenido de los claims.
 *  - `@/i18n/navigation` para capturar las llamadas a `redirect` sin
 *    que el test rompa por la excepción interna de Next.
 *
 * Cubrimos:
 *  - Sin sesión → redirect a `/entrar` con el locale recibido.
 *  - Rol leído desde `sessionClaims` (camino barato sin currentUser).
 *  - Rol leído de `currentUser()` cuando los claims no lo traen.
 *  - Rol leído de `unsafeMetadata` cuando publicMetadata está vacío (gap
 *    sign-up ↔ promoción capa 2).
 *  - Rol no permitido → redirect al destino del rol del usuario.
 *  - Rol permitido → devuelve { userId, role } y no redirige.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

const { authMock, currentUserMock, redirectMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
  currentUserMock: vi.fn(),
  redirectMock: vi.fn((args: { href: string; locale: string }) => {
    // Lanzamos para emular el corte de flujo real de `redirect` de next-intl,
    // pero con un Error tipado que podemos identificar en los tests.
    const err = new Error(`REDIRECT:${args.href}`);
    (err as { __redirect?: { href: string; locale: string } }).__redirect = args;
    throw err;
  }),
}));

vi.mock('@clerk/nextjs/server', () => ({
  auth: authMock,
  currentUser: currentUserMock,
}));

vi.mock('@/i18n/navigation', () => ({
  redirect: redirectMock,
}));

import { requireRole } from './guard';

/**
 * Atrapa la excepción del redirect mockeado y devuelve el destino. Hace
 * los tests más legibles al evitar try/catch en cada caso.
 */
async function captureRedirect(promise: Promise<unknown>) {
  try {
    await promise;
    return null;
  } catch (err) {
    return (err as { __redirect?: { href: string; locale: string } }).__redirect ?? null;
  }
}

describe('requireRole', () => {
  beforeEach(() => {
    authMock.mockReset();
    currentUserMock.mockReset();
    redirectMock.mockClear();
  });

  it('sin sesión → redirige a /entrar', async () => {
    authMock.mockResolvedValue({ userId: null, sessionClaims: null });

    const dest = await captureRedirect(requireRole(['client'], 'es'));

    expect(dest).toEqual({ href: '/entrar', locale: 'es' });
    expect(currentUserMock).not.toHaveBeenCalled();
  });

  it('lee rol desde sessionClaims sin pegar a currentUser', async () => {
    authMock.mockResolvedValue({
      userId: 'user_1',
      sessionClaims: { publicMetadata: { role: 'provider' } },
    });

    const result = await requireRole(['provider'], 'es');

    expect(result).toEqual({ userId: 'user_1', role: 'provider' });
    expect(currentUserMock).not.toHaveBeenCalled();
  });

  it('cae a currentUser cuando claims no traen rol', async () => {
    authMock.mockResolvedValue({ userId: 'user_2', sessionClaims: {} });
    currentUserMock.mockResolvedValue({
      publicMetadata: { role: 'admin' },
      unsafeMetadata: null,
    });

    const result = await requireRole(['admin'], 'es');

    expect(result).toEqual({ userId: 'user_2', role: 'admin' });
    expect(currentUserMock).toHaveBeenCalledOnce();
  });

  it('respeta unsafeMetadata cuando claims y publicMetadata están vacíos', async () => {
    authMock.mockResolvedValue({ userId: 'user_3', sessionClaims: null });
    currentUserMock.mockResolvedValue({
      publicMetadata: null,
      unsafeMetadata: { role: 'provider' },
    });

    const result = await requireRole(['provider'], 'ca');

    expect(result.role).toBe('provider');
  });

  it('rol no permitido → redirige al destino del rol del usuario', async () => {
    authMock.mockResolvedValue({
      userId: 'user_4',
      sessionClaims: { publicMetadata: { role: 'client' } },
    });

    const dest = await captureRedirect(requireRole(['provider'], 'es'));

    // Es un client intentando entrar al panel: lo mandamos a '/'.
    expect(dest).toEqual({ href: '/', locale: 'es' });
  });

  it('admin intentando entrar al panel → redirige a /admin', async () => {
    authMock.mockResolvedValue({
      userId: 'user_5',
      sessionClaims: { publicMetadata: { role: 'admin' } },
    });

    const dest = await captureRedirect(requireRole(['provider'], 'es'));

    expect(dest).toEqual({ href: '/admin', locale: 'es' });
  });

  it('lista permitida con varios roles → admite cualquiera de ellos', async () => {
    authMock.mockResolvedValue({
      userId: 'user_6',
      sessionClaims: { publicMetadata: { role: 'admin' } },
    });

    const result = await requireRole(['provider', 'admin'], 'es');

    expect(result.role).toBe('admin');
  });

  it('cuando currentUser devuelve null → cae a default client', async () => {
    authMock.mockResolvedValue({ userId: 'user_7', sessionClaims: null });
    currentUserMock.mockResolvedValue(null);

    // El default es 'client', así que admin se rechaza y redirige a '/'.
    const dest = await captureRedirect(requireRole(['admin'], 'es'));

    expect(dest).toEqual({ href: '/', locale: 'es' });
  });
});
