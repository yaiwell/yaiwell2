'use server';

import { auth } from '@clerk/nextjs/server';
import { z } from 'zod';

import { routing } from '@/i18n/routing';
import { updateAccountLocale } from '@/lib/services/account';

/** Resultado serializable de `setEmailLocaleAction`. */
export type SetEmailLocaleState = { ok: true } | { ok: false; code: 'invalid' | 'internal' };

const emailLocaleSchema = z.enum(routing.locales);

/**
 * Guarda el idioma de los correos de la sesión actual. No recibe ningún id:
 * nadie puede cambiar el de otra cuenta.
 *
 * @param input — idioma elegido; se valida con Zod.
 */
export async function setEmailLocaleAction(input: unknown): Promise<SetEmailLocaleState> {
  const { userId } = await auth();
  const parsed = emailLocaleSchema.safeParse(input);
  if (!userId || !parsed.success) return { ok: false, code: 'invalid' };

  try {
    await updateAccountLocale(userId, parsed.data);
    return { ok: true };
  } catch (error) {
    console.error('[cuenta/ajustes] email locale update failed:', error);
    return { ok: false, code: 'internal' };
  }
}
