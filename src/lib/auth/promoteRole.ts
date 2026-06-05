import type { UserJSON } from '@clerk/backend';
import { clerkClient } from '@clerk/nextjs/server';

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
 * - Si `unsafeMetadata.role` no tiene rol válido, no tocamos nada
 *   (no inventamos `client` aquí — eso ya lo cubre `getRoleFromUser`
 *   con su default seguro en tiempo de lectura).
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

  const unsafeRole = pickValidRole(payload.unsafe_metadata);
  if (!unsafeRole) return null; // no hay rol del que tirar.

  const client = await clerkClient();
  await client.users.updateUserMetadata(payload.id, {
    publicMetadata: { role: unsafeRole },
  });

  return unsafeRole;
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
