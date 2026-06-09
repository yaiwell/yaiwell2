/**
 * Tests del Route Handler `POST /api/storage/upload`.
 *
 * Mockeamos:
 *  - `@clerk/nextjs/server` (`auth`) para simular sesión presente/ausente.
 *  - `@/lib/integrations/supabase` (`uploadImage`) para no tocar Storage.
 *  - `@/lib/db/prisma` (`provider.findFirst`) para resolver la autorización
 *    en buckets que no son `avatars`.
 *
 * Cubrimos:
 *  - 401 sin sesión.
 *  - 400 cuando falta el archivo.
 *  - 400 cuando el MIME no está permitido.
 *  - 403 cuando el ownerId no pertenece al solicitante.
 *  - 200 en happy path para `avatars` y para `provider-photos`.
 *  - 500 cuando el wrapper de Storage lanza `StorageUploadError`.
 */

import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type * as SupabaseModule from '@/lib/integrations/supabase';

const { authMock, uploadImageMock, findFirstMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
  uploadImageMock: vi.fn(),
  findFirstMock: vi.fn(),
}));

vi.mock('@clerk/nextjs/server', () => ({
  auth: authMock,
}));

vi.mock('@/lib/integrations/supabase', async () => {
  const actual = await vi.importActual<typeof SupabaseModule>('@/lib/integrations/supabase');
  return {
    ...actual,
    uploadImage: uploadImageMock,
  };
});

vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    provider: {
      findFirst: findFirstMock,
    },
  },
}));

import { StorageUploadError } from '@/lib/integrations/supabase';

import { POST } from './route';

/**
 * Construye un NextRequest con multipart/form-data conteniendo los campos
 * indicados. Usa el FormData estándar y `Request` del runtime de tests.
 */
function buildFormRequest(fields: Record<string, string | File>): NextRequest {
  const form = new FormData();
  for (const [k, v] of Object.entries(fields)) {
    form.append(k, v);
  }
  const req = new Request('http://localhost/api/storage/upload', {
    method: 'POST',
    body: form,
  });
  return new NextRequest(req);
}

/**
 * Devuelve un File JPEG mínimo válido para los tests. No nos preocupamos
 * por el contenido binario real: el handler solo mira `size`, `type` y
 * el resto se delega al mock de uploadImage.
 */
function buildJpegFile(name = 'photo.jpg', size = 1024): File {
  const bytes = new Uint8Array(size);
  return new File([bytes], name, { type: 'image/jpeg' });
}

describe('POST /api/storage/upload', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('devuelve 401 sin sesión Clerk', async () => {
    authMock.mockResolvedValue({ userId: null });

    const req = buildFormRequest({
      bucket: 'avatars',
      ownerId: 'user_123',
      file: buildJpegFile(),
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error.code).toBe('UNAUTHENTICATED');
  });

  it('devuelve 400 cuando falta el archivo', async () => {
    authMock.mockResolvedValue({ userId: 'user_123' });

    const form = new FormData();
    form.append('bucket', 'avatars');
    form.append('ownerId', 'user_123');
    const req = new NextRequest(
      new Request('http://localhost/api/storage/upload', { method: 'POST', body: form }),
    );

    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe('BAD_REQUEST');
  });

  it('devuelve 400 cuando el MIME no está permitido', async () => {
    authMock.mockResolvedValue({ userId: 'user_123' });
    const file = new File([new Uint8Array(10)], 'evil.svg', { type: 'image/svg+xml' });

    const req = buildFormRequest({
      bucket: 'avatars',
      ownerId: 'user_123',
      file,
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe('BAD_REQUEST');
  });

  it('devuelve 403 cuando el ownerId del avatar no es el clerkId del solicitante', async () => {
    authMock.mockResolvedValue({ userId: 'user_123' });

    const req = buildFormRequest({
      bucket: 'avatars',
      ownerId: 'user_OTRO',
      file: buildJpegFile(),
    });
    const res = await POST(req);
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error.code).toBe('FORBIDDEN');
  });

  it('devuelve 403 cuando el provider no pertenece al usuario', async () => {
    authMock.mockResolvedValue({ userId: 'user_123' });
    findFirstMock.mockResolvedValue({ owner: { clerkId: 'user_otro' } });

    const req = buildFormRequest({
      bucket: 'provider-photos',
      ownerId: 'prov-1',
      file: buildJpegFile(),
    });
    const res = await POST(req);
    expect(res.status).toBe(403);
  });

  it('200 en happy path para avatars', async () => {
    authMock.mockResolvedValue({ userId: 'user_123' });
    uploadImageMock.mockResolvedValue({
      publicUrl: 'https://cdn/test/user_123/abc.jpg',
      path: 'user_123/abc.jpg',
    });

    const req = buildFormRequest({
      bucket: 'avatars',
      ownerId: 'user_123',
      file: buildJpegFile(),
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.publicUrl).toMatch(/^https:\/\//);
    expect(body.path.startsWith('user_123/')).toBe(true);
    expect(uploadImageMock).toHaveBeenCalledTimes(1);
    const args = uploadImageMock.mock.calls[0][0];
    expect(args.bucket).toBe('avatars');
    expect(args.contentType).toBe('image/jpeg');
    expect(args.path.startsWith('user_123/')).toBe(true);
    expect(args.path.endsWith('.jpg')).toBe(true);
  });

  it('200 en happy path para provider-photos cuando el provider pertenece al usuario', async () => {
    authMock.mockResolvedValue({ userId: 'user_123' });
    findFirstMock.mockResolvedValue({ owner: { clerkId: 'user_123' } });
    uploadImageMock.mockResolvedValue({
      publicUrl: 'https://cdn/test/prov-1/abc.webp',
      path: 'prov-1/abc.webp',
    });

    const file = new File([new Uint8Array(2048)], 'centro.webp', { type: 'image/webp' });
    const req = buildFormRequest({
      bucket: 'provider-photos',
      ownerId: 'prov-1',
      file,
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(findFirstMock).toHaveBeenCalled();
    const body = await res.json();
    expect(body.publicUrl).toMatch(/^https:\/\//);
  });

  it('mapea StorageUploadError del wrapper a 500', async () => {
    authMock.mockResolvedValue({ userId: 'user_123' });
    uploadImageMock.mockRejectedValue(new StorageUploadError('boom'));

    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const req = buildFormRequest({
      bucket: 'avatars',
      ownerId: 'user_123',
      file: buildJpegFile(),
    });
    const res = await POST(req);
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error.code).toBe('STORAGE_UPLOAD_FAILED');
    spy.mockRestore();
  });
});
