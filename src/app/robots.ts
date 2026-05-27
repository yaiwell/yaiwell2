import type { MetadataRoute } from 'next';

/**
 * URL base canónica para apuntar al sitemap desde robots.txt.
 * Misma lógica de fallback que en `sitemap.ts` y `layout.tsx`.
 */
const SITE_URL =
  process.env.NEXT_PUBLIC_APP_URL ??
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');

/**
 * Genera el `robots.txt` del sitio.
 *
 * En Fase 0 abrimos todo el sitio público a indexación y bloqueamos
 * solo las áreas que nunca deberían aparecer en buscadores:
 *  - `/api/*`: endpoints internos.
 *  - `/admin*`: panel de moderación interna.
 *  - `/panel*`: área privada del proveedor.
 *  - `/mis-reservas*`: área privada del cliente.
 *
 * El sitemap se anuncia para acelerar el descubrimiento por crawlers.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/', '/admin', '/panel', '/mis-reservas'],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
