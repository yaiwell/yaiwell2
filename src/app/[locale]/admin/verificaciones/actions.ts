'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import type { AppLocale } from '@/i18n/routing';
import { requireRole } from '@/lib/auth/server';
import {
  approveProvider,
  InvalidVerificationStatusError,
  ProviderNotFoundForVerificationError,
  rejectProvider,
  RejectionNotesRequiredError,
} from '@/lib/services/verification';
import { ensureUserFromClerk, MissingPrimaryEmailError } from '@/lib/services/user';

/**
 * Resultado serializable de las server actions de la cola admin.
 *
 * Códigos pequeños y estables — la UI los mapea a copy i18n sin
 * filtrar mensajes internos.
 */
export type VerificationActionState =
  | { ok: true }
  | {
      ok: false;
      code: 'PROVIDER_NOT_FOUND' | 'VALIDATION' | 'NOTES_REQUIRED' | 'FORBIDDEN' | 'INTERNAL';
    };

/**
 * Aprueba un provider en cola y redirige al listado.
 *
 * Doble guard: el layout `/admin` ya pide `requireRole(['admin'])`, pero
 * lo repetimos aquí porque la action puede ejecutarse vía POST directo
 * sin pasar por el layout (cualquier endpoint con la URL del action).
 */
export async function approveProviderAction(
  locale: AppLocale,
  providerId: string,
): Promise<VerificationActionState> {
  let reviewerUserId: string;
  try {
    const guard = await requireRole(['admin'], locale);
    // `requireRole` devuelve el `clerkId`; el `VerificationRequest.reviewedBy`
    // guarda el `User.id` interno, así que resolvemos vía
    // `ensureUserFromClerk` (idempotente, devuelve el row existente).
    const user = await ensureUserFromClerk(guard.userId);
    reviewerUserId = user.id;
  } catch (err) {
    if (err instanceof MissingPrimaryEmailError) {
      return { ok: false, code: 'INTERNAL' };
    }
    // `requireRole` lanza redirect interno si no es admin; un throw aquí
    // sería un caso raro (sesión inválida en medio del flujo).
    return { ok: false, code: 'FORBIDDEN' };
  }

  try {
    await approveProvider({ providerId }, reviewerUserId);
  } catch (err) {
    if (err instanceof ProviderNotFoundForVerificationError) {
      return { ok: false, code: 'PROVIDER_NOT_FOUND' };
    }
    if (err instanceof InvalidVerificationStatusError) {
      return { ok: false, code: 'VALIDATION' };
    }
    console.error('[admin/verificaciones] approveProviderAction error:', err);
    return { ok: false, code: 'INTERNAL' };
  }

  // Invalida caches y vuelve a la cola — la UI tras éxito ya no
  // verá este provider en pending.
  revalidatePath(`/${locale}/admin`);
  revalidatePath(`/${locale}/admin/verificaciones/${providerId}`);
  redirect(`/${locale}/admin`);
}

/**
 * Rechaza un provider con motivo obligatorio (>=5 chars) y vuelve a
 * la cola. Las notas se guardan en `verification_requests.notes` para
 * historial.
 */
export async function rejectProviderAction(
  locale: AppLocale,
  providerId: string,
  notes: string,
): Promise<VerificationActionState> {
  let reviewerUserId: string;
  try {
    const guard = await requireRole(['admin'], locale);
    const user = await ensureUserFromClerk(guard.userId);
    reviewerUserId = user.id;
  } catch (err) {
    if (err instanceof MissingPrimaryEmailError) {
      return { ok: false, code: 'INTERNAL' };
    }
    return { ok: false, code: 'FORBIDDEN' };
  }

  try {
    await rejectProvider({ providerId, notes }, reviewerUserId);
  } catch (err) {
    if (err instanceof ProviderNotFoundForVerificationError) {
      return { ok: false, code: 'PROVIDER_NOT_FOUND' };
    }
    if (err instanceof RejectionNotesRequiredError) {
      return { ok: false, code: 'NOTES_REQUIRED' };
    }
    console.error('[admin/verificaciones] rejectProviderAction error:', err);
    return { ok: false, code: 'INTERNAL' };
  }

  revalidatePath(`/${locale}/admin`);
  revalidatePath(`/${locale}/admin/verificaciones/${providerId}`);
  redirect(`/${locale}/admin`);
}
