'use server';

import { revalidatePath } from 'next/cache';
import { hasLocale } from 'next-intl';
import { ZodError } from 'zod';

import { routing, type AppLocale } from '@/i18n/routing';
import { requireRole } from '@/lib/auth/server';
import {
  SanctionAlreadyRevokedError,
  SanctionNotFoundError,
  revokeSanction,
  revokeSanctionSchema,
} from '@/lib/services/sanctions';
import { ensureUserFromClerk } from '@/lib/services/user';

/**
 * Códigos de error de `revokeSanctionAction`. `INVALID_REASON` va aparte
 * porque es el único que soporte corrige en el propio formulario.
 */
export type RevokeSanctionErrorCode =
  | 'NOT_FOUND'
  | 'ALREADY_REVOKED'
  | 'INVALID_REASON'
  | 'VALIDATION'
  | 'FORBIDDEN'
  | 'INTERNAL';

/** Resultado serializable de la revocación. */
export type RevokeSanctionActionState = { ok: true } | { ok: false; code: RevokeSanctionErrorCode };

/**
 * Revoca una sanción por no presentado desde `/admin/sanciones` (§4.bis:
 * pasadas las 24 h en que el negocio puede deshacerlo, solo soporte).
 *
 * Doble guard de rol: el layout de `/admin` ya lo exige, pero una server
 * action admite un POST directo. Motivo obligatorio, validado con
 * `revokeSanctionSchema` antes de tocar BD; queda auditado quién
 * (`User.id` interno del admin), cuándo y por qué. Revocar levanta en el
 * acto el bloqueo «solo online» si ya no quedan 3 en 12 meses (se calcula).
 *
 * @param locale — locale activo (guard y revalidación).
 * @param sanctionId — sanción a revocar.
 * @param reason — motivo libre (mínimo 5 caracteres sin contar espacios).
 */
export async function revokeSanctionAction(
  locale: AppLocale,
  sanctionId: string,
  reason: string,
): Promise<RevokeSanctionActionState> {
  if (!hasLocale(routing.locales, locale)) return { ok: false, code: 'VALIDATION' };

  let clerkUserId: string;
  try {
    ({ userId: clerkUserId } = await requireRole(['admin'], locale));
  } catch {
    // `requireRole` redirige si no es admin: aquí lo convertimos en rechazo.
    return { ok: false, code: 'FORBIDDEN' };
  }

  const parsed = revokeSanctionSchema.safeParse({ sanctionId, reason });
  if (!parsed.success) {
    const reasonIssue = parsed.error.issues.some((issue) => issue.path[0] === 'reason');
    return { ok: false, code: reasonIssue ? 'INVALID_REASON' : 'VALIDATION' };
  }

  try {
    const admin = await ensureUserFromClerk(clerkUserId);
    await revokeSanction(parsed.data, admin.id);
  } catch (err) {
    return { ok: false, code: mapRevokeError(err) };
  }

  revalidatePath(`/${locale}/admin/sanciones`);
  return { ok: true };
}

/** Traduce los errores tipados del dominio a códigos estables. */
function mapRevokeError(err: unknown): RevokeSanctionErrorCode {
  if (err instanceof ZodError) return 'VALIDATION';
  if (err instanceof SanctionNotFoundError) return 'NOT_FOUND';
  if (err instanceof SanctionAlreadyRevokedError) return 'ALREADY_REVOKED';
  console.error('[admin/sanciones] revokeSanctionAction error:', err);
  return 'INTERNAL';
}
