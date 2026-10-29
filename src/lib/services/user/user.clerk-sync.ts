import { clerkClient } from '@clerk/nextjs/server';
import { isClerkAPIResponseError } from '@clerk/nextjs/errors';

import { UserNotFoundError } from './user.errors';
import { syncUserFromBackendUser } from './user.service';

/**
 * Sincroniza la fila `users` releyendo el usuario de Clerk por su id.
 *
 * Lo usa el webhook en `user.created` y `user.updated` en lugar del
 * payload del evento: svix puede entregar eventos fuera de orden o
 * reintentar uno antiguo, y con el payload un `user.updated` viejo con
 * `role=client` deshacía en BD la conversión a profesional hecha en
 * `/hazte-profesional`. Con la lectura fresca, el orden de llegada no
 * importa: siempre se escribe el estado actual de Clerk.
 *
 * @param clerkUserId — id de Clerk (`event.data.id`).
 * @throws UserNotFoundError si Clerk responde 404 (usuario ya borrado;
 *   llegará un `user.deleted`). No sincronizamos el payload en ese caso
 *   porque resucitaría una fila que va a borrarse.
 */
export async function syncUserFromClerkById(clerkUserId: string) {
  const client = await clerkClient();
  let user;
  try {
    user = await client.users.getUser(clerkUserId);
  } catch (err) {
    if (isClerkAPIResponseError(err) && err.status === 404) {
      throw new UserNotFoundError('Clerk user no longer exists.');
    }
    throw err;
  }
  return syncUserFromBackendUser(user);
}
