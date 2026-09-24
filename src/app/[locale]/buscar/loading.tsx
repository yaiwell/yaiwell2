import { getTranslations } from 'next-intl/server';

import { Skeleton } from '@/components/ui/skeleton';

/**
 * Cuántas cards falsas pintamos. Seis llenan el primer scroll en mobile
 * y una fila y media en desktop: suficiente para que la rejilla no dé
 * un salto brusco cuando llegan los resultados reales.
 */
const PLACEHOLDER_CARDS = 6;

/**
 * Estado de carga de `/buscar`.
 *
 * La página encadena `searchProviders` (full-text + PostGIS +
 * disponibilidad) y la agregación de precios "desde": en el peor caso
 * el usuario miraba una pantalla congelada con los filtros anteriores
 * hasta que Postgres respondía. Con este esqueleto la navegación es
 * inmediata y el contenido entra en streaming.
 *
 * Reproduce la silueta real (cabecera + chips de filtro + rejilla de
 * cards con foto) en lugar de un spinner: así el layout no salta al
 * resolver.
 */
export default async function SearchLoading() {
  const t = await getTranslations('common');

  return (
    <div
      className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-8 md:px-8"
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label={t('loading')}
      data-component="search-loading"
    >
      <div className="flex flex-col gap-3">
        <Skeleton className="h-9 w-56 rounded-full" />
        <Skeleton className="h-12 w-full rounded-2xl" />
        <div className="flex flex-wrap gap-2">
          <Skeleton className="h-9 w-28 rounded-full" />
          <Skeleton className="h-9 w-24 rounded-full" />
          <Skeleton className="h-9 w-32 rounded-full" />
          <Skeleton className="h-9 w-20 rounded-full" />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: PLACEHOLDER_CARDS }, (_, index) => (
          <div key={index} className="flex flex-col gap-3">
            <Skeleton className="aspect-[4/3] w-full rounded-2xl" />
            <Skeleton className="h-5 w-3/4 rounded-full" />
            <Skeleton className="h-4 w-1/2 rounded-full" />
            <Skeleton className="h-4 w-2/5 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
