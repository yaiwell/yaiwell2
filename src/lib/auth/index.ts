/**
 * API pública del módulo de autenticación — **solo cliente-safe**.
 *
 * Este barrel se importa desde Client Components (formularios de
 * sign-up/sign-in). Por eso NO re-exportamos nada que toque
 * `@clerk/nextjs/server` ni `server-only`: si Webpack ve cualquier
 * referencia transitiva a server-only desde un Client Component
 * Bundle, el build revienta.
 *
 * Para los módulos server-only (`requireRole`, `promoteRoleToPublicMetadata`)
 * existe la fachada paralela `@/lib/auth/server`. Los consumidores
 * server-side (layouts protegidos, webhooks) importan desde ahí.
 */

export { AuthError } from './errors';
export { mapClerkError } from './mapClerkError';
export { getRoleFromUser, getRoleFromSessionClaims, resolvePostAuthDestination } from './role';
export type { AuthErrorCode, UserRole } from './types';
