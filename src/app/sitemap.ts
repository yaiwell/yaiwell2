import type { MetadataRoute } from 'next';

import { routing } from '@/i18n/routing';

/**
 * URL base canónica para construir las entradas del sitemap.
 * En Vercel preferimos `NEXT_PUBLIC_APP_URL`; si no existe caemos al
 * host autogenerado del deploy y, como último recurso, a localhost.
 */
const SITE_URL =
  process.env.NEXT_PUBLIC_APP_URL ??
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');

/**
 * Rutas estáticas que indexamos. No incluimos áreas privadas (panel
 * proveedor, área cliente, admin) ni fichas dinámicas todavía — esas
 * se añadirán en Fase 1 cuando consultemos la BD para enumerarlas.
 */
const STATIC_PATHS = [
  { path: '', priority: 1.0, changeFrequency: 'daily' as const },
  { path: '/buscar', priority: 0.9, changeFrequency: 'daily' as const },
  { path: '/panel', priority: 0.5, changeFrequency: 'monthly' as const },
  { path: '/mis-reservas', priority: 0.5, changeFrequency: 'monthly' as const },
] as const;

/**
 * Construye la URL absoluta para una ruta dada en un locale concreto.
 *
 * Con `localePrefix: 'as-needed'` el locale por defecto (`es`) no lleva
 * prefijo y los demás sí. Mantener esta lógica aquí evita acoplar el
 * sitemap a posibles cambios futuros del prefijo.
 */
function buildLocaleUrl(locale: string, path: string): string {
  const prefix = locale === routing.defaultLocale ? '' : `/${locale}`;
  // Aseguramos que no haya doble slash cuando `path` ya empieza por `/`.
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const suffix = normalizedPath === '/' ? '' : normalizedPath;
  return `${SITE_URL}${prefix}${suffix}`;
}

/**
 * Genera el sitemap.xml del sitio.
 *
 * Para cada ruta estática creamos una entrada por locale y declaramos
 * los `alternates.languages` (hreflang) para que los buscadores sirvan
 * la versión correcta según el mercado del usuario. El campo `x-default`
 * apunta al locale por defecto (castellano).
 *
 * Devolvemos `MetadataRoute.Sitemap` y Next.js se encarga de serializarlo
 * a XML válido con los namespaces necesarios.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  return STATIC_PATHS.flatMap((entry) =>
    routing.locales.map((locale) => ({
      url: buildLocaleUrl(locale, entry.path),
      lastModified,
      changeFrequency: entry.changeFrequency,
      priority: entry.priority,
      alternates: {
        languages: {
          ...Object.fromEntries(routing.locales.map((l) => [l, buildLocaleUrl(l, entry.path)])),
          'x-default': buildLocaleUrl(routing.defaultLocale, entry.path),
        },
      },
    })),
  );
}
