import { auth, currentUser } from '@clerk/nextjs/server';

import { redirect } from '@/i18n/navigation';
import type { AppLocale } from '@/i18n/routing';

import { getRoleFromSessionClaims, getRoleFromUser, resolvePostAuthDestination } from './role';
import type { UserRole } from './types';

/**
 * Forma mínima de los `sessionClaims` que necesita el guard para no
 * acoplarse al tipo `JwtPayload` completo de Clerk. El cast es seguro
 * porque `getRoleFromSessionClaims` ya hace narrowing defensivo.
 */
interface ClaimsShape {
  publicMetadata?: { role?: unknown } | null;
  metadata?: { role?: unknown } | null;
}

/**
 * Resultado de un guard exitoso. Se devuelve al layout/page caller para
 * que pueda usar el `userId` y `role` sin volver a pegar a Clerk.
 */
export interface GuardResult {
  userId: string;
  role: UserRole;
}

/**
 * Protege una ruta exigiendo que la sesión actual pertenezca a uno de
 * los roles permitidos. Pensado para usarse en layouts del App Router.
 *
 * Política:
 * - Sin sesión → redirect a `/entrar`. Tras el sign-in volvemos al destino
 *   por rol — no hacemos `?redirect_url=...` por ahora para no exponer
 *   destinos privados en la querystring.
 * - Con sesión pero rol no permitido → redirect al destino "natural" del
 *   rol (cliente → `/`, provider → `/panel`, admin → `/admin`). Esto evita
 *   pantallas 403 que confunden al usuario y trata el guard como un router
 *   silencioso.
 *
 * Lectura del rol:
 * 1. `sessionClaims.publicMetadata.role` si el JWT template los expone.
 *    Es lo barato — sin fetch a Clerk.
 * 2. Fallback a `currentUser()` que sí hace fetch pero lee también
 *    `unsafeMetadata.role` (necesario en el gap entre sign-up y la
 *    promoción a `publicMetadata` que ejecuta capa 2).
 *
 * Razón del fallback: hasta que el dashboard de Clerk tenga configurado
 * el JWT template con `publicMetadata`, los claims no traen el rol y
 * todos los guards harían fetch. Detectarlo aquí evita reescribir
 * llamadas en cada layout.
 *
 * @param allowedRoles — roles que pueden acceder. Pasar todos los roles
 *   equivale a "cualquier usuario autenticado".
 * @param locale — locale activo del request (lo necesita `redirect` de
 *   next-intl para construir la URL localizada).
 * @returns `{ userId, role }` si el guard pasa. Si no, llama a `redirect`
 *   (que lanza una excepción interna de Next y nunca retorna).
 */
export async function requireRole(
  allowedRoles: readonly UserRole[],
  locale: AppLocale,
): Promise<GuardResult> {
  const { userId, sessionClaims } = await auth();

  if (!userId) {
    redirect({ href: '/entrar', locale });
    // `redirect` lanza internamente, pero TS no lo sabe — hacemos `as never`
    // a través de un throw explícito para narrow del userId abajo.
    throw new Error('unreachable: redirect should have thrown');
  }

  // Intento barato: rol desde claims del JWT.
  let role = getRoleFromSessionClaims(sessionClaims as ClaimsShape | null);

  // Fallback: fetch del user completo. Solo si no había rol en claims.
  if (!role) {
    const user = await currentUser();
    role = getRoleFromUser(user);
  }

  if (!allowedRoles.includes(role)) {
    redirect({ href: resolvePostAuthDestination(role), locale });
    throw new Error('unreachable: redirect should have thrown');
  }

  return { userId, role };
}
