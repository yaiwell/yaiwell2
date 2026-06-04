/**
 * API pública del módulo de autenticación.
 *
 * Los consumidores (formularios, guards, webhook) importan desde aquí
 * y nunca desde archivos internos, para que podamos refactorizar la
 * organización del módulo sin romper imports.
 */

export { AuthError } from './errors';
export { mapClerkError } from './mapClerkError';
export { getRoleFromUser, getRoleFromSessionClaims, resolvePostAuthDestination } from './role';
export type { AuthErrorCode, UserRole } from './types';
