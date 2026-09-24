/**
 * URL base canónica del sitio, sin barra final.
 *
 * Imprescindible para que las URLs absolutas (`metadataBase`,
 * `openGraph.url`, hreflang del sitemap) apunten al host correcto en
 * cada entorno. Prioridad:
 *  1. `NEXT_PUBLIC_APP_URL` — el dominio real, configurado a mano.
 *  2. `VERCEL_URL` — host autogenerado del preview deployment.
 *  3. `http://localhost:3000` — desarrollo.
 *
 * Vivía duplicada en `layout.tsx` y en `sitemap.ts`; al centralizarla
 * garantizamos que la canónica declarada en el `<head>` y la publicada
 * en el sitemap no puedan divergir.
 */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_APP_URL ??
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')
).replace(/\/+$/, '');
