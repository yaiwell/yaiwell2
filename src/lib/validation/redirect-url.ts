import { z } from 'zod';

import { routing } from '@/i18n/routing';

/**
 * Validación del parámetro de retorno con el que una pantalla manda al
 * usuario a autenticarse y lo devuelve después a donde estaba.
 *
 * **Esto es un borde de seguridad, no una comodidad.** Un `redirect_url`
 * sin validar es un redirect abierto: basta con enlazar
 * `/entrar?redirect_url=https://yaiwell.phishing.example` para que la
 * víctima vea nuestro dominio, se autentique y aterrice en una copia del
 * sitio. Por eso sólo aceptamos **rutas internas**: nada de esquema,
 * nada de host, nada de protocol-relative (`//otrodominio.com`).
 *
 * El valor se guarda **sin prefijo de locale**: los helpers de
 * `@/i18n/navigation` ya añaden `/es`, `/ca`… al navegar, y volver a
 * prefijar produciría `/es/es/...`. Si llega prefijado (porque alguien
 * copió la URL del navegador), se lo quitamos aquí.
 */

/** Nombre del parámetro de query. Único en toda la app. */
export const REDIRECT_URL_PARAM = 'redirect_url';

/**
 * Tope de longitud. No hay ninguna ruta legítima ni de lejos tan larga;
 * existe para que un parámetro gigante no viaje por toda la app.
 */
const MAX_REDIRECT_URL_LENGTH = 512;

/**
 * Schema del parámetro crudo.
 *
 * `.catch(undefined)` en vez de lanzar: un `redirect_url` manipulado no
 * debe romper la pantalla de login — se ignora y el usuario aterriza en
 * su destino por rol, que es el comportamiento de siempre.
 */
export const redirectUrlSchema = z
  .string()
  .max(MAX_REDIRECT_URL_LENGTH)
  // Ruta absoluta del propio sitio.
  .refine((value) => value.startsWith('/'), { message: 'must be an internal path' })
  // `//host` y `/\host` son protocol-relative: el navegador los trata
  // como otro dominio aunque empiecen por barra.
  .refine((value) => !/^\/[\\/]/.test(value), { message: 'must not be protocol-relative' })
  // Backslashes y espacios se normalizan de forma distinta según el
  // navegador; no hay ruta legítima que los contenga sin codificar.
  .refine((value) => !/[\\\s]/.test(value), { message: 'must not contain backslashes or spaces' })
  // La API no es un destino de navegación.
  .refine((value) => !/^\/api(\/|$|\?)/.test(value), { message: 'must not target the API' })
  .optional()
  .catch(undefined);

/**
 * Extrae y sanea el destino de retorno de unos searchParams ya resueltos.
 *
 * @param raw — valor crudo del parámetro (string, array o ausente).
 * @returns la ruta interna sin prefijo de locale, o `null` si no hay
 *   parámetro o no es un destino aceptable.
 */
export function parseInternalRedirectUrl(raw: unknown): string | null {
  const parsed = redirectUrlSchema.safeParse(raw);
  if (!parsed.success || !parsed.data) return null;
  return stripLocalePrefix(parsed.data);
}

/**
 * Quita el segmento de locale inicial si lo hubiera.
 *
 * `/es/centro/x` → `/centro/x`; `/es` → `/`; `/centro/x` se queda igual.
 */
function stripLocalePrefix(path: string): string {
  for (const locale of routing.locales) {
    if (path === `/${locale}`) return '/';
    if (path.startsWith(`/${locale}/`)) return path.slice(locale.length + 1);
  }
  return path;
}

/**
 * Añade el `redirect_url` a un destino de autenticación.
 *
 * @param href — ruta interna de destino (`/entrar`, `/registro`).
 * @param redirectUrl — ruta a la que volver, o `null` para no añadir nada.
 * @returns el href con el parámetro codificado, listo para el `Link` de
 *   `@/i18n/navigation`.
 */
export function withRedirectUrl(href: string, redirectUrl: string | null): string {
  if (!redirectUrl) return href;
  const separator = href.includes('?') ? '&' : '?';
  return `${href}${separator}${REDIRECT_URL_PARAM}=${encodeURIComponent(redirectUrl)}`;
}
