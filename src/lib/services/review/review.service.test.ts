/**
 * Tests unitarios del servicio de reseñas.
 *
 * Mockeamos el cliente Prisma vía `vi.mock('@/lib/db/prisma', ...)` para
 * no depender de una BD real. Los tests cubren las reglas de negocio de
 * CLAUDE.md §4.bis: estado del booking, autoría, ventana de 30 días,
 * unicidad y autorización del reply.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ZodError } from 'zod';

vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    booking: {
      findUnique: vi.fn(),
    },
    review: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  },
}));

import { prisma } from '@/lib/db/prisma';
import {
  BookingNotCompletedError,
  BookingNotFoundError,
  ReviewAlreadyExistsError,
  ReviewNotFoundError,
  ReviewWindowExpiredError,
  UnauthorizedReplyError,
  UnauthorizedReviewerError,
  createReview,
  replyToReview,
} from './index';

// Helpers para acceder al mock tipado sin repetir el cast en cada test.
const bookingFindUnique = vi.mocked(prisma.booking.findUnique);
const reviewFindUnique = vi.mocked(prisma.review.findUnique);
const reviewCreate = vi.mocked(prisma.review.create);
const reviewUpdate = vi.mocked(prisma.review.update);

/**
 * Devuelve un booking "base" en estado completed con `completedAt`
 * desplazado los días que se pasen como argumento (negativo = pasado).
 * Mantenemos un único builder para que cada test ajuste solo lo que
 * le interesa y queden legibles.
 */
function buildBooking(
  overrides: Partial<{
    id: string;
    clientId: string;
    providerId: string;
    status: string;
    completedAtDaysAgo: number;
    providerUserId: string;
  }> = {},
) {
  const {
    id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    clientId = 'client-1',
    providerId = 'provider-1',
    status = 'completed',
    completedAtDaysAgo = 1,
    providerUserId = 'provider-user-1',
  } = overrides;

  const completedAt =
    status === 'completed' ? new Date(Date.now() - completedAtDaysAgo * 24 * 60 * 60 * 1000) : null;

  return {
    id,
    clientId,
    providerId,
    status,
    completedAt,
    provider: { id: providerId, userId: providerUserId },
  };
}

const validInput = {
  bookingId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  rating: 5,
  text: 'El servicio fue excelente, muy recomendable.',
};

beforeEach(() => {
  // resetAllMocks limpia tanto el historial como la cola de
  // mockResolvedValueOnce, evitando que respuestas queueadas en un test
  // se cuelen en el siguiente y rompan el aislamiento.
  vi.resetAllMocks();
});

describe('createReview', () => {
  it('crea la reseña cuando el booking está completed, dentro de ventana y sin review previa', async () => {
    bookingFindUnique.mockResolvedValueOnce(buildBooking() as never);
    reviewFindUnique.mockResolvedValueOnce(null);
    reviewCreate.mockResolvedValueOnce({ id: 'review-1' } as never);

    const result = await createReview(validInput, 'client-1');

    expect(reviewCreate).toHaveBeenCalledWith({
      data: {
        bookingId: validInput.bookingId,
        providerId: 'provider-1',
        authorId: 'client-1',
        rating: 5,
        text: validInput.text,
        photos: [],
      },
    });
    expect(result).toEqual({ id: 'review-1' });
  });

  it('rechaza si el booking no existe', async () => {
    bookingFindUnique.mockResolvedValueOnce(null);

    await expect(createReview(validInput, 'client-1')).rejects.toBeInstanceOf(BookingNotFoundError);
    expect(reviewCreate).not.toHaveBeenCalled();
  });

  it('rechaza un booking en estado pending', async () => {
    bookingFindUnique.mockResolvedValueOnce(buildBooking({ status: 'pending' }) as never);

    await expect(createReview(validInput, 'client-1')).rejects.toBeInstanceOf(
      BookingNotCompletedError,
    );
  });

  it('rechaza un booking en estado confirmed', async () => {
    bookingFindUnique.mockResolvedValueOnce(buildBooking({ status: 'confirmed' }) as never);

    await expect(createReview(validInput, 'client-1')).rejects.toBeInstanceOf(
      BookingNotCompletedError,
    );
  });

  it('rechaza un booking en estado cancelled', async () => {
    bookingFindUnique.mockResolvedValueOnce(buildBooking({ status: 'cancelled' }) as never);

    await expect(createReview(validInput, 'client-1')).rejects.toBeInstanceOf(
      BookingNotCompletedError,
    );
  });

  it('rechaza si el author no es el cliente del booking', async () => {
    bookingFindUnique.mockResolvedValueOnce(buildBooking({ clientId: 'someone-else' }) as never);

    await expect(createReview(validInput, 'client-1')).rejects.toBeInstanceOf(
      UnauthorizedReviewerError,
    );
  });

  it('rechaza si han pasado 31 días desde completedAt', async () => {
    bookingFindUnique.mockResolvedValueOnce(buildBooking({ completedAtDaysAgo: 31 }) as never);
    reviewFindUnique.mockResolvedValueOnce(null);

    await expect(createReview(validInput, 'client-1')).rejects.toBeInstanceOf(
      ReviewWindowExpiredError,
    );
  });

  it('acepta en el día 29 desde completedAt', async () => {
    bookingFindUnique.mockResolvedValueOnce(buildBooking({ completedAtDaysAgo: 29 }) as never);
    reviewFindUnique.mockResolvedValueOnce(null);
    reviewCreate.mockResolvedValueOnce({ id: 'review-29' } as never);

    const result = await createReview(validInput, 'client-1');

    expect(result).toEqual({ id: 'review-29' });
  });

  it('rechaza si ya existe una reseña para ese booking', async () => {
    bookingFindUnique.mockResolvedValueOnce(buildBooking() as never);
    reviewFindUnique.mockResolvedValueOnce({ id: 'existing' } as never);

    await expect(createReview(validInput, 'client-1')).rejects.toBeInstanceOf(
      ReviewAlreadyExistsError,
    );
    expect(reviewCreate).not.toHaveBeenCalled();
  });

  it('rechaza rating 0 con ZodError', async () => {
    await expect(createReview({ ...validInput, rating: 0 }, 'client-1')).rejects.toBeInstanceOf(
      ZodError,
    );
  });

  it('rechaza rating 6 con ZodError', async () => {
    await expect(createReview({ ...validInput, rating: 6 }, 'client-1')).rejects.toBeInstanceOf(
      ZodError,
    );
  });

  it('rechaza texto con menos de 10 caracteres con ZodError', async () => {
    await expect(createReview({ ...validInput, text: 'corto' }, 'client-1')).rejects.toBeInstanceOf(
      ZodError,
    );
  });
});

describe('replyToReview', () => {
  const validReply = {
    reviewId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    response: 'Gracias por tu valoración, te esperamos pronto.',
  };

  it('publica la respuesta cuando el dueño del provider la envía', async () => {
    reviewFindUnique.mockResolvedValueOnce({
      id: validReply.reviewId,
      provider: { id: 'provider-1', userId: 'provider-user-1' },
    } as never);
    reviewUpdate.mockResolvedValueOnce({
      id: validReply.reviewId,
      providerResponse: validReply.response,
    } as never);

    const result = await replyToReview(validReply, 'provider-user-1');

    expect(reviewUpdate).toHaveBeenCalledWith({
      where: { id: validReply.reviewId },
      data: {
        providerResponse: validReply.response,
        providerResponseAt: expect.any(Date),
      },
    });
    expect(result).toMatchObject({ providerResponse: validReply.response });
  });

  it('rechaza si quien responde no es el dueño del provider', async () => {
    reviewFindUnique.mockResolvedValueOnce({
      id: validReply.reviewId,
      provider: { id: 'provider-1', userId: 'provider-user-1' },
    } as never);

    await expect(replyToReview(validReply, 'someone-else')).rejects.toBeInstanceOf(
      UnauthorizedReplyError,
    );
    expect(reviewUpdate).not.toHaveBeenCalled();
  });

  it('rechaza si la reseña no existe', async () => {
    reviewFindUnique.mockResolvedValueOnce(null);

    await expect(replyToReview(validReply, 'provider-user-1')).rejects.toBeInstanceOf(
      ReviewNotFoundError,
    );
  });
});
