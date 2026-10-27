import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Tests de `submitReviewAction`.
 *
 * Fija el contrato del borde: locale validado, sesión obligatoria, Zod
 * antes de tocar el service, mapeo de cada error tipado del dominio a un
 * código estable y revalidación de `/mis-reservas` y de la ficha solo
 * cuando la reseña se crea. Las reglas de negocio en sí (autoría,
 * `completed`, 30 días, duplicados) ya las prueba `review.service.test`.
 */

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  ensureUserFromClerk: vi.fn(),
  createReview: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock('@clerk/nextjs/server', () => ({ auth: mocks.auth }));
vi.mock('next/cache', () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock('@/lib/services/user', () => ({ ensureUserFromClerk: mocks.ensureUserFromClerk }));

// Errores y schema reales del dominio review, sin arrastrar Prisma.
vi.mock('@/lib/services/review', async () => {
  const errors = await import('@/lib/services/review/review.errors');
  const validation = await import('@/lib/services/review/review.validation');
  return { ...errors, ...validation, createReview: mocks.createReview };
});

import {
  BookingNotCompletedError,
  BookingNotFoundError,
  ReviewAlreadyExistsError,
  ReviewWindowExpiredError,
  UnauthorizedReviewerError,
} from '@/lib/services/review/review.errors';

import { submitReviewAction } from './actions';

const INPUT = {
  bookingId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  rating: 4,
  text: 'Muy buen servicio, volveré pronto.',
};

beforeEach(() => {
  vi.resetAllMocks();
  mocks.auth.mockResolvedValue({ userId: 'clerk_1' });
  mocks.ensureUserFromClerk.mockResolvedValue({ id: 'user-1' });
  mocks.createReview.mockResolvedValue({ id: 'review-1' });
});

describe('submitReviewAction', () => {
  it('crea la reseña con el User.id de la sesión y revalida las dos rutas', async () => {
    await expect(submitReviewAction('es', INPUT)).resolves.toEqual({ ok: true });

    expect(mocks.createReview).toHaveBeenCalledWith(INPUT, 'user-1');
    expect(mocks.revalidatePath).toHaveBeenCalledWith('/es/mis-reservas');
    expect(mocks.revalidatePath).toHaveBeenCalledWith('/[locale]/centro/[slugWithId]', 'page');
  });

  it('devuelve FORBIDDEN sin sesión y no llama al service', async () => {
    mocks.auth.mockResolvedValue({ userId: null });

    await expect(submitReviewAction('es', INPUT)).resolves.toEqual({
      ok: false,
      code: 'FORBIDDEN',
    });
    expect(mocks.createReview).not.toHaveBeenCalled();
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });

  it('devuelve VALIDATION con un locale no soportado', async () => {
    await expect(submitReviewAction('fr', INPUT)).resolves.toEqual({
      ok: false,
      code: 'VALIDATION',
    });
    expect(mocks.auth).not.toHaveBeenCalled();
    expect(mocks.createReview).not.toHaveBeenCalled();
  });

  it.each([
    ['texto demasiado corto', { ...INPUT, text: 'corto' }],
    ['rating fuera de rango', { ...INPUT, rating: 6 }],
    ['bookingId no válido', { ...INPUT, bookingId: 'no-es-un-uuid' }],
    ['texto de solo espacios', { ...INPUT, text: ' '.repeat(30) }],
  ])('devuelve VALIDATION con %s', async (_label, input) => {
    await expect(submitReviewAction('es', input)).resolves.toEqual({
      ok: false,
      code: 'VALIDATION',
    });
    expect(mocks.createReview).not.toHaveBeenCalled();
  });

  it('descarta las fotos: el borde no las acepta todavía', async () => {
    const withPhotos = { ...INPUT, photos: ['https://example.com/a.jpg'] };

    await submitReviewAction('es', withPhotos);

    expect(mocks.createReview).toHaveBeenCalledWith(INPUT, 'user-1');
  });

  it.each([
    ['NOT_COMPLETED', new BookingNotCompletedError()],
    ['WINDOW_EXPIRED', new ReviewWindowExpiredError()],
    ['ALREADY_REVIEWED', new ReviewAlreadyExistsError()],
    ['FORBIDDEN', new UnauthorizedReviewerError()],
    ['FORBIDDEN', new BookingNotFoundError()],
    ['INTERNAL', new Error('boom')],
  ])('mapea a %s sin revalidar', async (code, error) => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mocks.createReview.mockRejectedValue(error);

    await expect(submitReviewAction('es', INPUT)).resolves.toEqual({ ok: false, code });
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});
