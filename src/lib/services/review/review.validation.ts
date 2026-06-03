/**
 * Schemas Zod para validar inputs del servicio de reseñas.
 *
 * Se aplican en los bordes del sistema (API route, server action) antes
 * de invocar el servicio. Mantenemos los límites alineados con los
 * comentarios en CLAUDE.md §4.bis y con las constraints del modelo.
 */

import { z } from 'zod';

/**
 * Validación de entrada para crear una valoración.
 *
 * - `rating` debe ser entero entre 1 y 5 (escala UI de estrellas).
 * - `text` mínimo 10 caracteres para evitar reseñas vacías o "ok".
 * - `text` máximo 2000 caracteres para que quepa en el card sin
 *   romper layout y para frenar spam masivo.
 * - `photos` máximo 5 URLs (mismo límite que se documenta en el modelo).
 */
export const createReviewSchema = z.object({
  bookingId: z.string().uuid(),
  rating: z.number().int().min(1).max(5),
  text: z.string().min(10).max(2000),
  photos: z.array(z.string().url()).max(5).optional(),
});

export type CreateReviewParsed = z.infer<typeof createReviewSchema>;

/**
 * Validación de entrada para que el proveedor responda a una reseña.
 *
 * - Mínimo 5 caracteres para evitar respuestas tipo "ok" o "👍".
 * - Máximo 1000 caracteres: una respuesta razonable cabe ahí.
 */
export const replyToReviewSchema = z.object({
  reviewId: z.string().uuid(),
  response: z.string().min(5).max(1000),
});

export type ReplyToReviewParsed = z.infer<typeof replyToReviewSchema>;
