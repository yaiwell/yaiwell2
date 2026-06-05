/**
 * Errores tipados del dominio `user` sincronizado desde Clerk.
 */

/**
 * El payload del webhook no tiene email primario válido. Clerk garantiza
 * email en `user.created` para flujos con email/password, pero los flujos
 * OAuth pueden enviar un `email_addresses` vacío hasta que el usuario
 * completa el alta. Distinguimos este caso para devolver 200 al webhook
 * (sin reintentar) en lugar de 500.
 */
export class MissingPrimaryEmailError extends Error {
  readonly code = 'MISSING_PRIMARY_EMAIL';
  constructor(message = 'El evento de Clerk no incluye un email primario válido.') {
    super(message);
  }
}

/**
 * Se recibe un `user.deleted` para un `clerkId` que no existe en la BD.
 * Suele ocurrir si el webhook llega antes del `user.created` por races
 * de Clerk. Tratamos como idempotente: el caller decide si loguear o no.
 */
export class UserNotFoundError extends Error {
  readonly code = 'USER_NOT_FOUND';
  constructor(message = 'No existe un usuario con ese clerkId.') {
    super(message);
  }
}
