/**
 * Tipos del dominio de reseñas.
 *
 * Las reseñas son siempre hijas de un Booking (FK obligatoria). Aquí
 * solo modelamos los inputs/outputs que cruzan la frontera del servicio;
 * la representación persistida vive en `prisma/schema.prisma` (modelo
 * Review).
 *
 * Reglas de negocio en CLAUDE.md §4.bis ("Valoraciones").
 */

/**
 * Datos necesarios para que un cliente cree una nueva reseña.
 *
 * `authorId` no entra en el input: se inyecta desde la sesión Clerk en el
 * servicio. Esto evita que un cliente pueda valorar suplantando a otro.
 */
export interface CreateReviewInput {
  bookingId: string;
  rating: number;
  text: string;
  photos?: string[];
}

/**
 * Datos necesarios para que el proveedor responda a una reseña.
 *
 * `providerUserId` (el dueño del Provider) tampoco entra en el input:
 * se inyecta desde la sesión Clerk y se verifica contra el provider
 * de la reseña antes de actualizar.
 */
export interface ReplyToReviewInput {
  reviewId: string;
  response: string;
}

/**
 * Resumen mínimo de una reseña para listados públicos en la ficha
 * de proveedor. Mantenemos solo los campos seguros (sin authorId)
 * para no exponer identidad del cliente al consumir el endpoint.
 */
export interface ReviewSummary {
  id: string;
  rating: number;
  text: string;
  createdAt: Date;
  providerResponse: string | null;
}
