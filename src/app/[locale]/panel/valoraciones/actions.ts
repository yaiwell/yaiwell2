'use server';

import { revalidatePath } from 'next/cache';
import { ZodError } from 'zod';

import type { AppLocale } from '@/i18n/routing';
import { requireCurrentProvider } from '@/lib/auth/server';
import { prisma } from '@/lib/db/prisma';
import { ReviewNotFoundError, UnauthorizedReplyError } from '@/lib/services/review/review.errors';
import { replyToReview } from '@/lib/services/review/review.service';

/**
 * Resultado serializable de las server actions del panel de valoraciones.
 *
 * Códigos pequeños y opacos para que el cliente decida el copy localizado
 * y no se filtren detalles internos (mensajes Prisma, stack traces…).
 */
export type ReviewsActionState =
  | { ok: true }
  | {
      ok: false;
      code: 'VALIDATION' | 'PROVIDER_NOT_FOUND' | 'REVIEW_NOT_FOUND' | 'FORBIDDEN' | 'INTERNAL';
      message?: string;
    };

/**
 * Publica la respuesta del proveedor autenticado a una reseña existente.
 *
 * Flujo:
 *  1. `requireCurrentProvider` exige rol `provider` y resuelve el Provider
 *     del usuario activo (redirige a `/onboarding` si todavía no existe).
 *  2. Resolvemos el `User.id` interno asociado al Provider, porque el
 *     service `replyToReview` autoriza comparando contra `provider.userId`
 *     (no contra el `clerkId`).
 *  3. Delegamos en el service del dominio, mapeando los errores tipados
 *     (`ReviewNotFoundError`, `UnauthorizedReplyError`, `ZodError`) a
 *     códigos opacos del `ReviewsActionState`.
 *  4. `revalidatePath` para que la próxima carga del panel muestre la
 *     respuesta recién publicada sin necesidad de un hard reload.
 *
 * No retornamos la reseña actualizada al cliente: tras `revalidate` el
 * Server Component reconstruye el listado y la UI se sincroniza sola.
 */
export async function replyToReviewAction(
  locale: AppLocale,
  reviewId: string,
  replyText: string,
): Promise<ReviewsActionState> {
  let providerId: string;
  try {
    const provider = await requireCurrentProvider(locale);
    providerId = provider.id;
  } catch {
    // `requireCurrentProvider` redirige cuando no hay provider; este
    // catch cubre el caso defensivo de no llegar a redirect (tests,
    // entornos sin Clerk montado, etc.).
    return { ok: false, code: 'PROVIDER_NOT_FOUND' };
  }

  // El service compara contra `provider.userId` (User.id interno). Una
  // sola query bastará: ya tenemos el providerId y solo necesitamos su
  // dueño. Evitamos una segunda llamada a Clerk + tabla `users`.
  const providerRow = await prisma.provider.findUnique({
    where: { id: providerId },
    select: { userId: true },
  });
  if (!providerRow) {
    return { ok: false, code: 'PROVIDER_NOT_FOUND' };
  }

  try {
    await replyToReview({ reviewId, response: replyText }, providerRow.userId);
  } catch (err) {
    if (err instanceof ZodError) {
      return { ok: false, code: 'VALIDATION', message: err.issues[0]?.message };
    }
    if (err instanceof ReviewNotFoundError) {
      return { ok: false, code: 'REVIEW_NOT_FOUND' };
    }
    if (err instanceof UnauthorizedReplyError) {
      return { ok: false, code: 'FORBIDDEN' };
    }
    console.error('[panel/valoraciones] replyToReviewAction error:', err);
    return { ok: false, code: 'INTERNAL' };
  }

  // Refrescamos el cache del listado para reflejar la nueva respuesta.
  revalidatePath(`/${locale}/panel/valoraciones`);
  return { ok: true };
}
