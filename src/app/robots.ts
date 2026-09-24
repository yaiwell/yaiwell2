import type { MetadataRoute } from 'next';

import { SITE_URL } from '@/lib/seo';

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
