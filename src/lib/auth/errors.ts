import type { AuthErrorCode } from './types';

/**
 * Error tipado del dominio de autenticación.
 *
 * Sustituye al `throw new Error('string')` genérico (regla §6.bis de
 * CLAUDE.md) para que los callers puedan hacer `instanceof AuthError`
 * y leer `error.code` en lugar de parsear strings.
 *
 * El campo `cause` permite envolver el error original de Clerk para
 * diagnóstico en consola sin filtrarlo al usuario.
 */
export class AuthError extends Error {
  readonly code: AuthErrorCode;

  constructor(code: AuthErrorCode, message?: string, cause?: unknown) {
    super(message ?? code);
    this.name = 'AuthError';
    this.code = code;
    if (cause !== undefined) {
      // `cause` es propiedad estándar de ES2022; la asignamos
      // explícitamente para mantener compatibilidad con runtimes que
      // no la copian del segundo argumento de super().
      (this as Error & { cause?: unknown }).cause = cause;
    }
  }
}
