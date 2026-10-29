import type { UserJSON } from '@clerk/backend';
import { isClerkAPIResponseError } from '@clerk/nextjs/errors';
import { clerkClient } from '@clerk/nextjs/server';

import { sanitizeSelfServiceRole } from './role';
import type { UserRole } from './types';

/**
 * Promueve el rol de `unsafeMetadata` a `publicMetadata` en Clerk.
 *
 * Razón de existir: el sign-up del cliente sólo puede escribir
 * `unsafeMetadata` (el SDK frontend no permite escribir `publicMetadata`,
 * que es el campo "de confianza" para el backend). Para que el JWT
 * incluya el rol y los guards puedan leerlo sin un fetch a Clerk en
 * cada request, levantamos el rol al `publicMetadata` cuando recibimos
 * el evento `user.created`.
 *
 * Idempotencia:
 * - Si `publicMetadata.role` ya tiene un valor válido, no tocamos nada
 *   (el rol oficial siempre gana frente al unsafe).
 * - Si `unsafeMetadata.role` no es `client` ni `provider` (ausente,
 *   inválido o `admin`), promocionamos `client`. Antes no se tocaba
 *   nada y la cuenta quedaba sin rol oficial, con lo que el guard caía
 *   al `unsafeMetadata`, que el usuario puede reescribir.
 *
 * Errores:
 * - Si la llamada a Clerk falla (red caída, key inválida), propagamos
 *   la excepción. El webhook la trata como 500 y Clerk reintenta.
 *
 * Nota de seguridad: este código sólo se ejecuta dentro del webhook, ya
 * autenticado por svix. No es invocable desde el cliente.
 *
 * @returns el rol promovido, o `null` si no se hizo nada.
 */
export async function promoteRoleToPublicMetadata(payload: UserJSON): Promise<UserRole | null> {
  const publicRole = pickValidRole(payload.public_metadata);
  if (publicRole) return null; // ya está bien, nada que hacer.

  // Del rol que manda el navegador solo valen cliente o profesional:
  // `admin` nunca se promociona. Sin rol válido (p. ej. una cuenta que
  // nace al entrar con Google desde `/entrar`), fijamos `client`: así
  // ninguna cuenta queda sin rol oficial y el usuario no puede elegirlo
  // después reescribiendo su `unsafeMetadata`.
  const role =
    sanitizeSelfServiceRole((payload.unsafe_metadata as { role?: unknown } | null)?.role) ??
    'client';

  const client = await clerkClient();
  // El payload es la foto del alta, y Clerk reintenta entregas viejas:
  // releemos el usuario para no pisar un rol puesto después a mano
  // (p. ej. `admin` o `provider` desde el dashboard).
  // Releer justo antes de escribir deja la ventana de carrera en una
  // sola ida y vuelta a Clerk; su API no ofrece escritura condicional.
  let current;
  try {
    current = await client.users.getUser(payload.id);
  } catch (err) {
    // Usuario ya borrado en Clerk (reintento tardío): no hay nada que
    // promocionar, y lanzar haría que Clerk reintentase sin fin.
    if (isClerkAPIResponseError(err) && err.status === 404) return null;
    throw err;
  }
  if (pickValidRole(current.publicMetadata)) return null;

  await client.users.updateUserMetadata(payload.id, {
    publicMetadata: { role },
  });

  return role;
}

/**
 * Devuelve el rol si el objeto metadata contiene un valor válido,
 * o `null` en cualquier otro caso (campo ausente, string vacío, valor
 * desconocido tipo `'superuser'`).
 */
function pickValidRole(metadata: unknown): UserRole | null {
  if (!metadata || typeof metadata !== 'object') return null;
  const raw = (metadata as { role?: unknown }).role;
  if (raw === 'client' || raw === 'provider' || raw === 'admin') return raw;
  return null;
}
