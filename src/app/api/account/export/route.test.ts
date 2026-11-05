/**
 * Tests del endpoint de descarga de datos: exige sesión y entrega un adjunto
 * que no se guarda en caché.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

const { authMock, buildMock } = vi.hoisted(() => ({ authMock: vi.fn(), buildMock: vi.fn() }));

vi.mock('@clerk/nextjs/server', () => ({ auth: authMock }));
vi.mock('@/lib/services/account', () => ({ buildAccountExport: buildMock }));

import { GET } from './route';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('GET /api/account/export', () => {
  it('responde 401 sin sesión y no lee datos', async () => {
    authMock.mockResolvedValue({ userId: null });

    const response = await GET();

    expect(response.status).toBe(401);
    expect(buildMock).not.toHaveBeenCalled();
  });

  it('entrega los datos del usuario de la sesión como adjunto sin caché', async () => {
    authMock.mockResolvedValue({ userId: 'clerk_1' });
    buildMock.mockResolvedValue({
      exportedAt: new Date('2026-11-05T10:00:00.000Z'),
      profile: { email: 'ana@yaiwell.test' },
    });

    const response = await GET();

    expect(buildMock).toHaveBeenCalledWith('clerk_1');
    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Disposition')).toContain('yaiwell-datos-2026-11-05.json');
    expect(response.headers.get('Cache-Control')).toBe('no-store');
    expect(await response.json()).toMatchObject({ profile: { email: 'ana@yaiwell.test' } });
  });

  it('no filtra el error interno', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    authMock.mockResolvedValue({ userId: 'clerk_1' });
    buildMock.mockRejectedValue(new Error('secreto de la BD'));

    const response = await GET();

    expect(response.status).toBe(500);
    expect(await response.text()).not.toContain('secreto');
  });
});
