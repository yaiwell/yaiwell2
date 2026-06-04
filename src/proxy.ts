import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import createMiddleware from 'next-intl/middleware';

import { routing } from './i18n/routing';

/**
 * Proxy global de Next.js 16 (antes `middleware.ts`).
 *
 * Compone dos responsabilidades:
 *
 * 1. **Auth (`clerkMiddleware`)**: identifica al request con Clerk y
 *    expone `auth()` a Server Components, Route Handlers y server actions.
 *    Sin proteger ninguna ruta por ahora — el marketplace público debe
 *    navegarse sin sesión; las páginas autenticadas se protegerán en su
 *    propio `layout.tsx` con `auth.protect()` cuando toque.
 *
 * 2. **i18n (`next-intl`)**: detecta el locale, añade/elimina el prefijo
 *    según `localePrefix: 'as-needed'` y negocia con `Accept-Language` y
 *    la cookie de preferencia. Solo aplica a rutas de página, no a `/api/*`.
 *
 * Orden: Clerk envuelve al de next-intl. Para `/api/*` cortamos antes de
 * delegar en next-intl (las APIs no necesitan i18n y next-intl
 * intentaría redirigir con prefijos que rompen las rutas REST).
 */
const intlMiddleware = createMiddleware(routing);

// Rutas que NO deben pasar por next-intl (APIs, webhooks).
const isApiRoute = createRouteMatcher(['/api/(.*)']);

export default clerkMiddleware(async (_auth, req) => {
  if (isApiRoute(req)) {
    return;
  }
  return intlMiddleware(req);
});

export const config = {
  /**
   * Matcher combinado:
   * - Excluye assets estáticos y rutas internas (`_next`, `_vercel`,
   *   archivos con extensión) para no pagar el coste del middleware.
   * - Incluye `/api/*` explícitamente para que Clerk pueda autenticar
   *   los Route Handlers (el primer patrón los excluiría).
   */
  matcher: ['/((?!_next|_vercel|.*\\..*).*)', '/(api|trpc)(.*)'],
};
