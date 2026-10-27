'use server';

import { auth } from '@clerk/nextjs/server';
import { revalidatePath } from 'next/cache';
import { hasLocale } from 'next-intl';
import { ZodError } from 'zod';

import { routing } from '@/i18n/routing';
import {
  BookingNotCompletedError,
  BookingNotFoundError,
  ReviewAlreadyExistsError,
  ReviewWindowExpiredError,
  UnauthorizedReviewerError,
  createReview,
  createReviewSchema,
} from '@/lib/services/review';
import { ensureUserFromClerk } from '@/lib/services/user';

/**
 * Códigos de error de `submitReviewAction`.
 *
 * Estables y opacos: la UI los traduce a copy i18n y nunca recibe el
 * mensaje crudo del servidor (Prisma, Zod o el texto interno del error).
 */
export type SubmitReviewErrorCode =
  | 'NOT_COMPLETED'
  | 'WINDOW_EXPIRED'
  | 'ALREADY_REVIEWED'
  | 'FORBIDDEN'
  | 'VALIDATION'
  | 'INTERNAL';

/** Resultado serializable de `submitReviewAction`. */
export type SubmitReviewActionState = { ok: true } | { ok: false; code: SubmitReviewErrorCode };

/**
 * Entrada que manda el formulario de valoración.
 *
 * Se tipa para dar autocompletado al Client Component, pero la
 * validación real es Zod: una server action es un endpoint público.
 */
export interface SubmitReviewActionInput {
  bookingId: string;
  rating: number;
  text: string;
}

/**
 * Schema del borde: el de dominio sin `photos`.
 *
 * Las reseñas no llevan fotos (decisión de producto del 2026-10-27): la
 * action no acepta `photos`, aunque `createReviewSchema` lo permita, para
 * que nadie pueda colar URLs arbitrarias con un POST directo.
 */
const submitReviewSchema = createReviewSchema.omit({ photos: true });

/**
 * Publica la valoración del cliente autenticado sobre una de sus reservas.
 *
 * Flujo:
 *  1. Valida el `locale` (llega del cliente y acaba en `revalidatePath`).
 *  2. Exige sesión de Clerk y resuelve el `User.id` interno.
 *  3. Valida la entrada con Zod.
 *  4. Delega en `createReview`, que aplica todas las reglas de §4.bis:
 *     autoría, `completed`, ventana de 30 días y una reseña por reserva.
 *     `bookingId` llega del navegador, pero el service comprueba que la
 *     reserva es de este cliente.
 *  5. Revalida `/mis-reservas` y la ficha del centro, cuya nota media
 *     recalcula el trigger `trg_reviews_refresh_provider_rating`.
 *
 * @param locale — locale activo de la página.
 * @param input — reserva, nota (1-5) y texto (10-2000).
 */
export async function submitReviewAction(
  locale: string,
  input: SubmitReviewActionInput,
): Promise<SubmitReviewActionState> {
  if (!hasLocale(routing.locales, locale)) {
    return { ok: false, code: 'VALIDATION' };
  }

  // Cualquier usuario con sesión puede valorar sus propias reservas (un
  // proveedor en modo cliente también reserva). La autorización fina
  // —que la reserva sea suya— la hace `createReview`.
  const { userId: clerkUserId } = await auth();
  if (!clerkUserId) {
    return { ok: false, code: 'FORBIDDEN' };
  }

  const parsed = submitReviewSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, code: 'VALIDATION' };
  }

  try {
    const user = await ensureUserFromClerk(clerkUserId);
    await createReview(parsed.data, user.id);
  } catch (err) {
    return { ok: false, code: mapReviewError(err) };
  }

  revalidatePath(`/${locale}/mis-reservas`);
  // La ficha vive en `/centro/[slugWithId]`; revalidamos el patrón en vez
  // de reconstruir la URL porque el slug puede cambiar y no compensa otra
  // query solo para leerlo.
  revalidatePath('/[locale]/centro/[slugWithId]', 'page');
  return { ok: true };
}

/** Traduce los errores tipados del dominio review a códigos estables. */
function mapReviewError(err: unknown): SubmitReviewErrorCode {
  if (err instanceof ZodError) return 'VALIDATION';
  if (err instanceof BookingNotCompletedError) return 'NOT_COMPLETED';
  if (err instanceof ReviewWindowExpiredError) return 'WINDOW_EXPIRED';
  if (err instanceof ReviewAlreadyExistsError) return 'ALREADY_REVIEWED';
  // Reserva inexistente y reserva ajena dan el mismo código: así no se
  // revela a un tercero si un id de reserva existe.
  if (err instanceof UnauthorizedReviewerError || err instanceof BookingNotFoundError) {
    return 'FORBIDDEN';
  }
  console.error('[mis-reservas] submitReviewAction error:', err);
  return 'INTERNAL';
}
