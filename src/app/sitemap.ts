import type { MetadataRoute } from 'next';

import { routing } from '@/i18n/routing';
import { buildHreflangMap, buildLocaleUrl } from '@/lib/seo';
import { providersRepository } from '@/lib/services/providers';
import { buildProviderSlugWithId } from '@/lib/utils/provider-slug';

/**
 * El sitemap consulta BD, así que lo servimos por request en lugar de
 * congelarlo en build. Dos motivos:
 *  - `next build` debe poder correr sin `DATABASE_URL` (ver el comentario
 *    de `@/lib/db/prisma`); un sitemap prerenderizado reventaría el build
 *    de Vercel.
 *  - Un sitemap generado en build listaría los centros del último deploy:
 *    cada alta nueva tardaría en indexarse lo que tarde el siguiente
 *    despliegue. Los crawlers piden `sitemap.xml` unas pocas veces al
 *    día; una consulta de tres columnas por visita es un precio
 *    despreciable frente a eso.
 */
export const dynamic = 'force-dynamic';

/**
 * Rutas públicas e indexables. Las áreas autenticadas (`/panel`,
 * `/mis-reservas`, `/cuenta`, `/onboarding`, admin) quedan fuera a
 * propósito: exigen sesión, así que el crawler solo recogería una
 * redirección al login. Figuraban en el sitemap pese a que el propio
 * comentario de este fichero decía lo contrario.
 */
const STATIC_PATHS = [
  { path: '/', priority: 1.0, changeFrequency: 'daily' as const },
  { path: '/buscar', priority: 0.9, changeFrequency: 'daily' as const },
  { path: '/profesionales', priority: 0.7, changeFrequency: 'monthly' as const },
] as const;

/**
 * Tope de fichas de centro. El protocolo Sitemaps permite 50.000 URLs
 * por fichero y emitimos una por locale, así que repartimos el cupo
 * entre los idiomas soportados y dejamos margen para las estáticas.
 */
const MAX_PROVIDERS = Math.floor(50_000 / routing.locales.length) - STATIC_PATHS.length;

/**
 * Construye las entradas (una por locale) de una ruta concreta.
 *
 * Cada entrada declara los `alternates.languages` completos —los cuatro
 * idiomas más `x-default`— generados desde `routing.locales`, nunca a
 * mano. Es el mismo helper que alimenta las canónicas del `<head>`, así
 * que sitemap y metadatos no pueden contradecirse.
 */
function buildEntries(
  href: string,
  lastModified: Date,
  changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency'],
  priority: number,
): MetadataRoute.Sitemap {
  const languages = buildHreflangMap(href, true);

  return routing.locales.map((locale) => ({
    url: buildLocaleUrl(locale, href),
    lastModified,
    changeFrequency,
    priority,
    alternates: { languages },
  }));
}

/**
 * Recupera las fichas públicas de centro. Si la BD no responde
 * devolvemos lista vacía en lugar de tumbar el sitemap entero: es
 * preferible publicar las rutas estáticas que devolver un 500 al
 * crawler, que lo interpretaría como sitio caído.
 */
async function loadProviderEntries(lastModified: Date): Promise<MetadataRoute.Sitemap> {
  try {
    const providers = await providersRepository.findAllForSitemap(MAX_PROVIDERS);

    return providers.flatMap((provider) =>
      buildEntries(
        `/centro/${buildProviderSlugWithId(provider)}`,
        provider.updatedAt ?? lastModified,
        'weekly',
        0.8,
      ),
    );
  } catch (error) {
    console.error('[sitemap] no se pudieron listar los centros:', error);
    return [];
  }
}

/**
 * Genera el sitemap.xml del sitio.
 *
 * Publica, por cada ruta pública y cada locale, una URL **con prefijo
 * de idioma**. Con `localePrefix: 'always'` la raíz sin prefijo (`/`,
 * `/buscar`) no sirve contenido: el proxy de next-intl la redirige
 * según `Accept-Language`. La versión anterior de este fichero las
 * publicaba como las URLs de castellano, así que una de cada cuatro
 * entradas era una redirección.
 *
 * Incluimos las fichas de centro porque son el contenido público real
 * del marketplace (tienen `generateMetadata` propio, texto indexable y
 * fotos) y sin ellas el sitemap solo describía el chrome del sitio.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const lastModified = new Date();

  const staticEntries = STATIC_PATHS.flatMap((entry) =>
    buildEntries(entry.path, lastModified, entry.changeFrequency, entry.priority),
  );

  return [...staticEntries, ...(await loadProviderEntries(lastModified))];
}
