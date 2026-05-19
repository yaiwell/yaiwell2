import createMiddleware from 'next-intl/middleware';

import { routing } from './i18n/routing';

/**
 * Proxy de next-intl encargado de:
 * - Detectar el locale preferido del visitante.
 * - Añadir/eliminar el prefijo de locale según `localePrefix: 'as-needed'`.
 * - Negociar el idioma con el header `Accept-Language` y la cookie de
 *   preferencia persistida por next-intl.
 *
 * Nota técnica: en Next.js 16 el file convention `middleware.ts` se renombró
 * a `proxy.ts` (mismo comportamiento, nombre nuevo). El import del helper de
 * next-intl sigue siendo `next-intl/middleware` porque eso es el nombre del
 * paquete/módulo, no el del archivo.
 */
export default createMiddleware(routing);

export const config = {
  /**
   * Aplicamos el proxy a todas las rutas SALVO:
   * - `/api/*`: endpoints del propio backend, no necesitan i18n.
   * - `/_next/*` y `/_vercel/*`: assets internos del framework y del host.
   * - Archivos con extensión (`*.*`): imágenes, fuentes, sitemap.xml, etc.
   *
   * Usamos un negative lookahead para evitar enumerar manualmente cada
   * extensión y para que cualquier archivo estático futuro quede excluido
   * automáticamente.
   */
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
};
