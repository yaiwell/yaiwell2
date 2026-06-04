import type { UserRole } from './types';

/**
 * Forma mínima que necesitamos del `UserResource` de Clerk (cliente).
 *
 * No importamos `@clerk/types` para mantener este módulo libre de
 * dependencias del SDK y poder testearlo con objetos plain.
 */
interface UserLike {
  publicMetadata?: { role?: unknown } | null;
  unsafeMetadata?: { role?: unknown } | null;
}

/**
 * Lee el rol del usuario desde `publicMetadata.role` con fallback a
 * `unsafeMetadata.role` (durante el gap entre sign-up y webhook).
 *
 * Razón del fallback: `publicMetadata` sólo se puede escribir desde el
 * SDK backend, así que el sign-up del cliente escribe el rol en
 * `unsafeMetadata.role` y el webhook `user.created` (capa 2) lo copia
 * a `publicMetadata.role`. Mientras ese webhook no exista o aún no se
 * haya disparado, leemos del `unsafeMetadata` para que la app pueda
 * decidir destinos correctos desde el primer instante.
 *
 * Si ninguna fuente tiene un rol válido, devolvemos `'client'` como
 * default seguro (el catálogo público es accesible para clientes).
 */
export function getRoleFromUser(user: UserLike | null | undefined): UserRole {
  if (!user) return 'client';
  const fromPublic = sanitizeRole(user.publicMetadata?.role);
  if (fromPublic) return fromPublic;
  const fromUnsafe = sanitizeRole(user.unsafeMetadata?.role);
  if (fromUnsafe) return fromUnsafe;
  return 'client';
}

/**
 * Decide el destino post-autenticación según el rol.
 *
 * Centralizado aquí para que sign-in, sign-up y el guard de capa 3
 * compartan el criterio sin riesgo de drift.
 */
export function resolvePostAuthDestination(role: UserRole): '/' | '/panel' {
  return role === 'provider' ? '/panel' : '/';
}

/**
 * Forma de los sessionClaims de Clerk que nos interesa.
 *
 * Si el dashboard de Clerk tiene configurado un JWT template que expone
 * `publicMetadata` en los claims, podremos leer el rol sin un fetch
 * extra al endpoint `/v1/users/me`. Mientras no esté configurado el
 * acceso devolverá `undefined` y caemos a `currentUser()`.
 */
interface SessionClaimsShape {
  publicMetadata?: { role?: unknown } | null;
  metadata?: { role?: unknown } | null;
}

/**
 * Lee el rol desde los `sessionClaims` de Clerk (lado servidor).
 *
 * Devuelve `null` si los claims no contienen el rol — caller decide si
 * hacer fallback a `currentUser()` (más lento) o asumir `'client'`.
 */
export function getRoleFromSessionClaims(
  claims: SessionClaimsShape | null | undefined,
): UserRole | null {
  if (!claims) return null;
  const fromPublic = sanitizeRole(claims.publicMetadata?.role);
  if (fromPublic) return fromPublic;
  const fromMetadata = sanitizeRole(claims.metadata?.role);
  if (fromMetadata) return fromMetadata;
  return null;
}

/**
 * Normaliza un valor `unknown` a `UserRole` válido o `null`.
 *
 * Evita que un metadata corrupto (string vacío, otro role no soportado,
 * número) propague un valor inválido al resto del sistema.
 */
function sanitizeRole(raw: unknown): UserRole | null {
  if (raw === 'client' || raw === 'provider') return raw;
  return null;
}
