'use server';

import { revalidatePath } from 'next/cache';
import { ZodError } from 'zod';
import { auth } from '@clerk/nextjs/server';

import type { AppLocale } from '@/i18n/routing';
import { requireCurrentProvider } from '@/lib/auth/server';
import {
  ProviderForOnboardingNotFoundError,
  updateProviderPhotos,
} from '@/lib/services/provider-onboarding';
import { ensureUserFromClerk } from '@/lib/services/user';

/** Estado serializable del resultado de la action. */
export type UpdatePhotosActionState =
  | { ok: true }
  | {
      ok: false;
      code: 'PROVIDER_NOT_FOUND' | 'VALIDATION' | 'INTERNAL';
      message?: string;
    };

/**
 * Persiste el array `Provider.photos` del provider autenticado.
 *
 * Reutiliza `updateProviderPhotos` del módulo de onboarding (validación
 * con `updatePhotosSchema` + ownership + repository update). El
 * `PhotoUploader` invoca esta action con la lista completa (no
 * incrementales) cada vez que cambia su set — la action sobreescribe
 * `photos` en BD; la idempotencia la garantiza el cliente.
 */
export async function updateProviderPhotosAction(
  locale: AppLocale,
  photos: string[],
): Promise<UpdatePhotosActionState> {
  const { userId: clerkId } = await auth();
  if (!clerkId) {
    return { ok: false, code: 'PROVIDER_NOT_FOUND' };
  }

  const internal = await ensureUserFromClerk(clerkId);
  const { id: providerId } = await requireCurrentProvider(locale);

  try {
    await updateProviderPhotos(providerId, { photos }, internal.id);
  } catch (err) {
    if (err instanceof ZodError) {
      return { ok: false, code: 'VALIDATION', message: err.issues[0]?.message };
    }
    if (err instanceof ProviderForOnboardingNotFoundError) {
      return { ok: false, code: 'PROVIDER_NOT_FOUND' };
    }
    console.error('[panel/centro] updateProviderPhotosAction error:', err);
    return { ok: false, code: 'INTERNAL' };
  }

  revalidatePath(`/${locale}/panel/centro`);
  return { ok: true };
}
