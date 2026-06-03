/**
 * Repositorio de reseñas: encapsula todas las queries Prisma del dominio.
 *
 * No contiene reglas de negocio (las decide `review.service.ts`); aquí
 * solo viven lecturas y escrituras tipadas. El service mockea este
 * módulo indirectamente mockeando `@/lib/db/prisma`.
 */

import { prisma } from '@/lib/db/prisma';

export const reviewRepository = {
  /**
   * Devuelve el booking junto con los datos mínimos del provider
   * necesarios para autorizar la respuesta (su `userId`).
   *
   * Se incluye el provider con select porque `review.service.ts`
   * necesita saber a quién pertenece la reserva sin tener que
   * disparar una segunda query.
   */
  async findBookingWithProvider(bookingId: string) {
    return prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        provider: {
          select: { id: true, userId: true },
        },
      },
    });
  },

  /**
   * Devuelve la reseña con el provider asociado para poder validar
   * que quien responde es realmente su dueño.
   */
  async findReviewById(id: string) {
    return prisma.review.findUnique({
      where: { id },
      include: {
        provider: {
          select: { id: true, userId: true },
        },
      },
    });
  },

  /**
   * Busca una reseña existente para un booking. Se usa para detectar
   * duplicados antes de intentar el insert (la BD lo bloquearía igual
   * por @unique, pero queremos el error tipado y un mensaje claro).
   */
  async findReviewByBookingId(bookingId: string) {
    return prisma.review.findUnique({ where: { bookingId } });
  },

  /**
   * Inserta una nueva reseña con los campos denormalizados que el
   * modelo exige (providerId, authorId).
   */
  async createReview(data: {
    bookingId: string;
    providerId: string;
    authorId: string;
    rating: number;
    text: string;
    photos: string[];
  }) {
    return prisma.review.create({ data });
  },

  /**
   * Graba la respuesta del proveedor y la marca temporal asociada.
   * Atomic: ambas columnas se actualizan en la misma operación.
   */
  async updateReviewResponse(id: string, response: string) {
    return prisma.review.update({
      where: { id },
      data: {
        providerResponse: response,
        providerResponseAt: new Date(),
      },
    });
  },
};
