'use server';

import { auth } from '@clerk/nextjs/server';
import { revalidatePath } from 'next/cache';

import type { BecomeProviderResult } from '@/lib/auth';
import { convertClientToProvider } from '@/lib/auth/server';
import { becomeProviderInputSchema } from '@/lib/validation';

/**
 * Convierte la cuenta de cliente de la sesión en cuenta de profesional
 * para que pueda crear su negocio en `/onboarding`.
 *
 * Es el camino de quien entró por primera vez con Google (su cuenta
 * nace como cliente) o de quien ya era cliente y quiere ofrecer
 * servicios con la misma cuenta.
 *
 * No redirige: devuelve un resultado tipado y el Client Component
 * refresca el token de sesión antes de navegar. Si redirigiéramos desde
 * aquí, el JWT seguiría diciendo `client` hasta su siguiente refresco y
 * las APIs del wizard (que leen el rol de los claims) responderían 403.
 *
 * @param locale — locale activo de la página (acaba en `revalidatePath`).
 * @param plan — plan elegido en `/profesionales`; si no es válido se
 *   ignora. Solo es una preferencia de UI: nunca concede el plan.
 */
export async function becomeProviderAction(
  locale: unknown,
  plan?: unknown,
): Promise<BecomeProviderResult> {
  // Una server action es un endpoint público: validamos con Zod.
  const parsed = becomeProviderInputSchema.safeParse({ locale, plan });
  if (!parsed.success) return { status: 'invalid-input' };

  const { userId } = await auth();
  if (!userId) return { status: 'unauthenticated' };

  try {
    const outcome = await convertClientToProvider(userId, parsed.data.plan ?? null);
    if (outcome.status === 'converted') {
      // El shell (cabecera, menú de cuenta) pinta según el rol.
      revalidatePath(`/${parsed.data.locale}`, 'layout');
    }
    return outcome;
  } catch (err) {
    console.error('[become-provider] conversion failed:', err);
    return { status: 'error' };
  }
}
