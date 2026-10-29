import { clerkClient } from '@clerk/nextjs/server';

import type { PlanTierId } from '@/lib/services/plans';
import { syncUserFromBackendUser } from '@/lib/services/user';

import { getRoleFromUser } from './role';

/** Resultado de intentar convertir una cuenta en profesional. */
export type ConvertToProviderOutcome =
  | { status: 'converted' }
  | { status: 'already-provider' }
  | { status: 'forbidden' };

/**
 * Convierte la cuenta de un cliente en cuenta de profesional.
 *
 * Reglas:
 * - El rol se lee del usuario **recién pedido a Clerk**, no de los
 *   claims de la sesión: el JWT puede ir hasta un minuto por detrás.
 * - `admin` nunca se convierte (`forbidden`): perdería su rol.
 * - `provider` no se toca (`already-provider`).
 * - `client` pasa a `publicMetadata.role = 'provider'`, el campo de
 *   confianza que solo escribe el backend. No usamos `unsafeMetadata`
 *   para el rol porque el propio usuario puede reescribirlo.
 * - Si llega un plan, se guarda en `unsafeMetadata.selectedPlan` solo
 *   como preferencia de la UI del wizard: nunca concede el plan (eso lo
 *   hace el cobro de Stripe Billing).
 *
 * `updateUserMetadata` hace merge profundo, así que no pisa el resto
 * de metadatos (locale, businessName…). Tras escribir en Clerk
 * sincronizamos `users.role` con el usuario devuelto, sin esperar al
 * webhook `user.updated`. Si esa escritura en BD falla devolvemos
 * `converted` igualmente: Clerk es la fuente de verdad del rol (guards
 * y APIs lo leen de ahí) y el webhook, que relee el usuario de Clerk,
 * dejará la BD al día.
 *
 * @param clerkUserId — id de Clerk del usuario de la sesión.
 * @param plan — plan ya validado o `null`.
 */
export async function convertClientToProvider(
  clerkUserId: string,
  plan: PlanTierId | null,
): Promise<ConvertToProviderOutcome> {
  const client = await clerkClient();
  const current = await client.users.getUser(clerkUserId);
  const role = getRoleFromUser(current);

  if (role === 'admin') return { status: 'forbidden' };
  if (role === 'provider') return { status: 'already-provider' };

  const updated = await client.users.updateUserMetadata(clerkUserId, {
    publicMetadata: { role: 'provider' },
    ...(plan && { unsafeMetadata: { selectedPlan: plan } }),
  });
  try {
    await syncUserFromBackendUser(updated);
  } catch (err) {
    console.error('[become-provider] db sync failed after Clerk update:', err);
  }

  return { status: 'converted' };
}
