import { notFound } from 'next/navigation';
import { hasLocale } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';

import { SearchView } from '@/components/features/search';
import type { SearchViewInitialState } from '@/components/features/search';
import { routing } from '@/i18n/routing';
import { getFromPriceCents, searchProviders } from '@/lib/services/providers';
import type { PriceRange } from '@/types/domain';

interface SearchPageProps {
  // En Next.js 16 `params` y `searchParams` son Promises.
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

/**
 * Página `/buscar` (en castellano y catalán).
 *
 * Server Component que:
 *  1. Valida el locale.
 *  2. Parsea los `searchParams` a un objeto de filtros tipado.
 *  3. Invoca `searchProviders` server-side para el SSR inicial.
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
  // `priceRange` viene como CSV "€,€€" → array.
  const query = typeof sp.q === 'string' ? sp.q : '';
  const categorySlug = typeof sp.cat === 'string' && sp.cat.length > 0 ? sp.cat : null;
  const availabilityOnly = sp.now === '1' || sp.now === 'true';
  const minRating = typeof sp.rating === 'string' ? Number(sp.rating) : NaN;
  const priceRangeRaw = typeof sp.price === 'string' ? sp.price : '';
  const allowedRanges: PriceRange[] = ['€', '€€', '€€€'];
  const priceRange = priceRangeRaw
    .split(',')
    .map((s) => s.trim())
    .filter((s): s is PriceRange => allowedRanges.includes(s as PriceRange));

  // Ejecutamos la búsqueda. El service ya enriquece con disponibilidad
  // y devuelve la lista ordenada lista para pintar.
  const providers = await searchProviders({
    query: query || undefined,
    categorySlug: categorySlug ?? undefined,
    availabilityOnly,
    minRating: Number.isFinite(minRating) ? minRating : undefined,
    priceRange: priceRange.length > 0 ? priceRange : undefined,
  });

  // Mapa providerId → precio "desde". Se calcula una vez aquí para
  // evitar que cada card llame al servicio por su cuenta.
  const fromPriceMap: Record<string, number | null> = {};
  for (const p of providers) {
    fromPriceMap[p.id] = getFromPriceCents(p.id);
  }

  const initial: SearchViewInitialState = {
    providers,
    fromPriceMap,
    filters: {
      query,
      categorySlug,
      availabilityOnly,
      priceRange,
      minRating: Number.isFinite(minRating) ? minRating : null,
    },
  };

  return (
    <div data-component="search-page" className="contents">
      <SearchView initial={initial} />
    </div>
  );
}
