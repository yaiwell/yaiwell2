import type { PlanTierId } from '@/lib/services/plans';

import { resolvePostAuthDestination } from './role';
import type { UserRole } from './types';

/**
 * Reglas puras (client-safe) del paso «convertir mi cuenta de cliente
 * en profesional».
 *
 * Existe porque quien entra por primera vez con Google desde `/entrar`
 * (o quien ya era cliente y pulsa Google en `/registro?as=provider`)
 * acaba con rol `client`, y `/onboarding` solo admite profesionales.
 * Sin un camino explícito no había forma de crear el negocio (decisión
 * de producto del 2026-10-29, CLAUDE.md §4.bis «Planes y cuentas de
 * negocio»).
 *
 * Aquí solo viven rutas y decisiones de navegación: la escritura en
 * Clerk está en `convertToProvider.ts` (server-only).
 */

/** Ruta (sin locale) de la pantalla de confirmación. */
export const BECOME_PROVIDER_PATH = '/hazte-profesional';

/**
 * Resultado de la server action `becomeProviderAction`.
 *
 * - `converted`: la cuenta era de cliente y ya es profesional.
 * - `already-provider`: ya era profesional; no se ha tocado nada.
 * - `unauthenticated`: no hay sesión.
 * - `forbidden`: la cuenta es de administración (nunca se convierte).
 * - `invalid-input`: el locale no es válido.
 * - `error`: fallo inesperado (Clerk o BD caídos).
 */
export type BecomeProviderResult =
  | { status: 'converted' }
  | { status: 'already-provider' }
  | { status: 'unauthenticated' }
  | { status: 'forbidden' }
  | { status: 'invalid-input' }
  | { status: 'error' };

/**
 * Construye el href de la pantalla de confirmación conservando el plan
 * que el usuario eligió en `/profesionales`.
 *
 * @param plan — plan ya validado, o `null`/`undefined` si no hay.
 */
export function buildBecomeProviderHref(plan?: PlanTierId | null): string {
  return plan ? `${BECOME_PROVIDER_PATH}?plan=${plan}` : BECOME_PROVIDER_PATH;
}

/**
 * Decide a dónde va quien abre `/registro` con la sesión ya iniciada.
 *
 * Un cliente que llega con intención de profesional (`?as=provider`,
 * los CTA de `/profesionales`) va a la pantalla de conversión con su
 * plan; el resto, a su destino natural por rol, como siempre.
 *
 * @param role — rol actual de la sesión.
 * @param intent — rol y plan pedidos en la URL, ya saneados con Zod.
 * @param redirectUrl — ruta interna de retorno, ya saneada.
 */
export function resolveSignedInSignUpDestination(
  role: UserRole,
  intent: { role?: 'client' | 'provider' | undefined; plan?: PlanTierId | undefined },
  redirectUrl?: string | null,
): string {
  if (role === 'client' && intent.role === 'provider') {
    return buildBecomeProviderHref(intent.plan);
  }
  return resolvePostAuthDestination(role, redirectUrl);
}

/**
 * Decide si `/hazte-profesional` se muestra o redirige.
 *
 * - Cliente → se muestra (`null`).
 * - Profesional → `/onboarding`, que a su vez manda al panel si el
 *   negocio ya está creado.
 * - Admin → su panel: una cuenta de administración nunca se convierte.
 */
export function resolveBecomeProviderPageRedirect(role: UserRole): string | null {
  if (role === 'client') return null;
  if (role === 'provider') return '/onboarding';
  return resolvePostAuthDestination(role);
}

/**
 * Decide si `/onboarding` se muestra o redirige.
 *
 * Un cliente ya no va a la portada: va a la pantalla de conversión,
 * que es el único camino para crear su negocio sin otra cuenta.
 */
export function resolveOnboardingRedirect(role: UserRole): string | null {
  if (role === 'provider') return null;
  if (role === 'client') return BECOME_PROVIDER_PATH;
  return resolvePostAuthDestination(role);
}
