/**
 * Persistencia de la `UserLocation` en cookie.
 *
 * Usamos cookie (no `localStorage`) por dos motivos:
 *  - La cookie viaja en la primera petición, lo que permite a los Server
 *    Components leer la ubicación inicial sin parpadeo.
 *  - CLAUDE.md §6 prohíbe `localStorage`/`sessionStorage` en producción
 *    del marketplace.
 *
 * El valor en cookie es JSON.stringify de la `UserLocation` envuelto en
 * `encodeURIComponent` (necesario porque las llaves `{}` son válidas en
 * cookies pero las comas no si la cookie viaja por algunos proxies).
 *
 * En lectura siempre validamos con un schema Zod interno: si el formato
 * cambia entre versiones o un usuario manipula la cookie, devolvemos
 * `null` en lugar de propagar datos basura por toda la app.
 */

import { z } from 'zod';

import { COOKIE_MAX_AGE_SECONDS, COOKIE_NAME } from './location.constants';
import type { UserLocation } from './location.types';

/**
 * Schema Zod que valida una `UserLocation` deserializada.
 * Los rangos protegen contra cookies manipuladas (lat/lng fuera de rango,
 * timestamps negativos, sources inventados).
 */
const userLocationSchema = z.object({
  lat: z.number().gte(-90).lte(90),
  lng: z.number().gte(-180).lte(180),
  accuracyMeters: z.number().nonnegative().optional(),
  capturedAt: z.number().int().nonnegative(),
  source: z.enum(['gps', 'fallback', 'manual']),
});

/** Parsea el valor crudo de la cookie (ya decodificado) a `UserLocation`. */
function parseLocationValue(raw: string): UserLocation | null {
  try {
    const parsed = JSON.parse(raw);
    const result = userLocationSchema.safeParse(parsed);
    if (!result.success) return null;
    return result.data;
  } catch {
    // JSON inválido: tratamos como cookie corrupta, no propagamos el error.
    return null;
  }
}

/**
 * Lee la ubicación desde `document.cookie` (lado cliente).
 *
 * Devuelve `null` si no existe, está expirada o tiene formato inválido.
 * Solo debe llamarse en cliente; en servidor devolverá `null` porque
 * `document` no existe.
 */
export function readLocationCookie(): UserLocation | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${COOKIE_NAME}=([^;]*)`));
  if (!match) return null;
  try {
    const raw = decodeURIComponent(match[1]);
    return parseLocationValue(raw);
  } catch {
    return null;
  }
}

/**
 * Escribe la ubicación en `document.cookie`.
 *
 * Atributos:
 *  - `Path=/`: disponible en toda la app.
 *  - `Max-Age`: 30 días.
 *  - `SameSite=Lax`: bloquea envío cross-site no esencial sin romper la
 *    navegación normal (links externos siguen funcionando).
 *
 * No marcamos `Secure` aquí porque debe poder escribirse en `localhost`
 * durante desarrollo. En producción Vercel sirve solo HTTPS, así que la
 * cookie viaja igualmente sobre TLS.
 */
export function writeLocationCookie(loc: UserLocation): void {
  if (typeof document === 'undefined') return;
  const payload = encodeURIComponent(JSON.stringify(loc));
  document.cookie = `${COOKIE_NAME}=${payload}; path=/; max-age=${COOKIE_MAX_AGE_SECONDS}; SameSite=Lax`;
}

/**
 * Elimina la cookie de ubicación.
 *
 * Forzamos `Max-Age=0` (en lugar de `Expires` en el pasado) porque es la
 * forma estándar moderna y evita problemas con relojes del cliente mal
 * sincronizados.
 */
export function clearLocationCookie(): void {
  if (typeof document === 'undefined') return;
  document.cookie = `${COOKIE_NAME}=; path=/; max-age=0; SameSite=Lax`;
}

/**
 * Parser SSR-safe.
 *
 * Recibe el header `Cookie` completo (tal cual lo expone Next.js en
 * Server Components con `cookies()` o en `headers()`) y devuelve la
 * `UserLocation` si existe y es válida.
 *
 * Usar este helper en SSR evita que un Server Component intente leer
 * `document.cookie` (que no existe) y permite pintar el primer render
 * ya con la ubicación correcta.
 */
export function readLocationFromHeaders(
  cookieHeader: string | null | undefined,
): UserLocation | null {
  if (!cookieHeader) return null;

  // Buscamos el segmento `name=value` con una regex tolerante a espacios
  // alrededor del separador `;`. No usamos `split` para no asumir que el
  // separador es exactamente "; " (algunos proxies envían "," o sin espacio).
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${COOKIE_NAME}=([^;]*)`));
  if (!match) return null;

  try {
    const raw = decodeURIComponent(match[1]);
    return parseLocationValue(raw);
  } catch {
    return null;
  }
}
