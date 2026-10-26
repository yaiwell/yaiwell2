import { createHash, timingSafeEqual } from 'node:crypto';

/**
 * Autenticación de las invocaciones de Vercel Cron.
 *
 * Convención de Vercel: si el proyecto define `CRON_SECRET`, cada
 * ejecución del cron llega con `Authorization: Bearer <CRON_SECRET>`.
 * Las rutas `/api/cron/*` son públicas a nivel de red, así que este
 * chequeo es lo único que impide a cualquiera dispararlas.
 */

/** Resultado de verificar la cabecera de un cron. */
export type CronAuthResult = 'authorized' | 'unauthorized' | 'unconfigured';

/**
 * Verifica la cabecera `Authorization` contra `CRON_SECRET`.
 *
 * Comparación en tiempo constante: hasheamos ambos lados con SHA-256
 * para que `timingSafeEqual` reciba buffers de igual longitud y ni el
 * contenido ni la longitud del secreto se filtren por tiempos.
 *
 * @param authorizationHeader — valor crudo de la cabecera (o `null`).
 * @param secret — `CRON_SECRET`; inyectable para tests.
 * @returns `unconfigured` si no hay secreto, `unauthorized` si no
 *   coincide, `authorized` si sí.
 */
export function verifyCronAuthorization(
  authorizationHeader: string | null,
  secret: string | undefined = process.env.CRON_SECRET,
): CronAuthResult {
  if (!secret) return 'unconfigured';
  if (!authorizationHeader) return 'unauthorized';

  const expected = createHash('sha256').update(`Bearer ${secret}`).digest();
  const received = createHash('sha256').update(authorizationHeader).digest();
  return timingSafeEqual(expected, received) ? 'authorized' : 'unauthorized';
}
