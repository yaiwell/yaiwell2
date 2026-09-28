import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { hasLocale } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { SearchView, buildSearchCategories, parseSearchParams } from '@/components/features/search';
import type { SearchViewInitialState } from '@/components/features/search';
import { routing } from '@/i18n/routing';
import { buildAlternates } from '@/lib/seo';
import { getCategoriesTree } from '@/lib/services/provider-panel';
import { getFromPriceCentsBatch, searchProviders } from '@/lib/services/providers';

interface SearchPageProps {
  // En Next.js 16 `params` y `searchParams` son Promises.
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

/**
 * Metadatos propios de `/buscar`.
 *
 * Sin `generateMetadata` propio la página heredaba el `defaultTitle` del
 * layout, que es la copy de la home — no aporta valor SEO al search
 * (audit 2026-05-27 §🟠 4). Aquí definimos un title específico que la
 * plantilla `%s | Yaiwell` del layout completa con sufijo de marca.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const safeLocale = hasLocale(routing.locales, locale) ? locale : routing.defaultLocale;
  const t = await getTranslations({ locale: safeLocale, namespace: 'seo.search' });
  const alternates = buildAlternates(safeLocale, '/buscar');

  return {
    title: t('title'),
    description: t('description'),
    alternates,
    openGraph: {
      title: t('title'),
      description: t('description'),
      url: alternates.canonical,
    },
    twitter: { title: t('title'), description: t('description') },
  };
}

/**
 * Página `/buscar` (en castellano y catalán).
 *
 * Server Component que:
 *  1. Valida el locale.
 *  2. Parsea los `searchParams` a un objeto de filtros tipado.
 *  3. Invoca `searchProviders` server-side para el SSR inicial y carga
 *     el árbol de categorías de la BD para los chips.
 *  4. Calcula el precio "desde" de cada proveedor para las cards.
 *  5. Pasa el snapshot al orquestador cliente `<SearchView>`.
 *
 * Cuando el usuario cambia filtros, el cliente navega con nuevas
 * `searchParams` y este Server Component se vuelve a ejecutar.
 */
export default async function SearchPage({ params, searchParams }: SearchPageProps) {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }
  setRequestLocale(locale);

  const sp = await searchParams;

  // Convertimos los searchParams (siempre strings) a filtros tipados.
  // El parser vive junto a `buildSearchParams` para que ida y vuelta de
  // la URL no puedan divergir (ver `SearchView.url.ts`).
  const { nearMeOnly, ...filters } = parseSearchParams(sp);
  const { query, categorySlug, availabilityOnly, minRating, priceRange } = filters;

  // Ejecutamos la búsqueda. El service ya enriquece con disponibilidad
  // y devuelve la lista ordenada lista para pintar.
  // Las categorías salen de la BD (no de fake-data) en paralelo con la
  // búsqueda: son independientes y así no sumamos latencia.
  const [providers, categoriesTree] = await Promise.all([
    searchProviders({
      query: query || undefined,
      categorySlug: categorySlug ?? undefined,
      availabilityOnly,
      minRating: minRating ?? undefined,
      priceRange: priceRange.length > 0 ? priceRange : undefined,
    }),
    getCategoriesTree(),
  ]);
  // Resolvemos nombres al locale aquí: al cliente solo le llegan strings.
  const categories = buildSearchCategories(categoriesTree, locale, categorySlug);

  // Mapa providerId → precio "desde", en UNA sola agregación agrupada.
  // Antes se lanzaba un MIN por proveedor (N consultas por request);
  // en paralelo seguía siendo N viajes a BD, solo que simultáneos.
  const fromPriceEntries = await getFromPriceCentsBatch(providers.map((p) => p.id));
  const fromPriceMap: Record<string, number | null> = {};
  for (const provider of providers) {
    fromPriceMap[provider.id] = fromPriceEntries.get(provider.id) ?? null;
  }

  const initial: SearchViewInitialState = {
    providers,
    fromPriceMap,
    filters,
    nearMeOnly,
  };

  return (
    <div data-component="search-page" className="contents">
      <SearchView initial={initial} categories={categories} />
    </div>
  );
}
