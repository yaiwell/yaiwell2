'use server';

import { revalidatePath } from 'next/cache';
import { ZodError } from 'zod';
import { auth } from '@clerk/nextjs/server';

import type { AppLocale } from '@/i18n/routing';
import { requireCurrentProvider } from '@/lib/auth/server';
import { ProviderNotFoundError, updateProviderSettings } from '@/lib/services/provider';
import {
  ProviderForOnboardingNotFoundError,
  updateProviderPhotos,
} from '@/lib/services/provider-onboarding';
import { ensureUserFromClerk } from '@/lib/services/user';

/** Estado serializable del resultado de la action de fotos. */
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

/**
 * Input bruto del formulario de settings tal como lo envía el cliente.
 * `description` viene como string del locale activo; la action la
 * envuelve en `LocalizedText` parcial antes de pasar al service.
 */
export interface ProviderSettingsRawInput {
  businessName: string;
  vatNumber: string;
  description: string;
  address: string;
}

/**
 * Estado serializable del resultado de `updateProviderSettingsAction`.
 * Códigos pequeños para que el cliente decida copy sin filtrar detalles
 * internos.
 */
export type UpdateProviderSettingsActionState =
  | { ok: true }
  | {
      ok: false;
      code: 'PROVIDER_NOT_FOUND' | 'VALIDATION' | 'INTERNAL';
      message?: string;
    };

/**
 * Persiste los campos editables del centro desde `/panel/centro`.
 *
 * Hoy cubre los cuatro que el formulario expone (businessName,
 * vatNumber, description, address). Teléfono, email de contacto,
 * ciudad/CP por separado y horario semanal entran cuando el formulario
 * los recoja de verdad (TODO).
 *
 * `description` se persiste fusionando con las traducciones existentes
 * para no perder las claves de los demás idiomas (mismo patrón que
 * `updateServiceAction`). Si el textarea llega vacío, no enviamos la
 * clave del locale activo: preservamos lo que hubiera en BD.
 */
export async function updateProviderSettingsAction(
  locale: AppLocale,
  raw: ProviderSettingsRawInput,
): Promise<UpdateProviderSettingsActionState> {
  const { userId: clerkId } = await auth();
  if (!clerkId) {
    return { ok: false, code: 'PROVIDER_NOT_FOUND' };
  }

  const { id: providerId } = await requireCurrentProvider(locale);

  const trimmedDescription = raw.description.trim();
  const descriptionPatch = trimmedDescription ? { [locale]: trimmedDescription } : undefined;

  try {
    await updateProviderSettings(providerId, {
      businessName: raw.businessName,
      vatNumber: raw.vatNumber,
      description: descriptionPatch,
      address: raw.address,
    });
  } catch (err) {
    if (err instanceof ZodError) {
      return { ok: false, code: 'VALIDATION', message: err.issues[0]?.message };
    }
    if (err instanceof ProviderNotFoundError) {
      return { ok: false, code: 'PROVIDER_NOT_FOUND' };
    }
    console.error('[panel/centro] updateProviderSettingsAction error:', err);
    return { ok: false, code: 'INTERNAL' };
  }

  revalidatePath(`/${locale}/panel/centro`);
  return { ok: true };
}
