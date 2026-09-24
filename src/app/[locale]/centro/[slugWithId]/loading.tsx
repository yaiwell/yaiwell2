import { getTranslations } from 'next-intl/server';

import { Skeleton } from '@/components/ui/skeleton';

/** Cuatro filas de servicio: lo que se ve sin scroll bajo la galería. */
const PLACEHOLDER_SERVICES = 4;

/**
 * Estado de carga de la ficha de centro.
 *
 * Es la pantalla más pesada del árbol público: detalle del proveedor
 * con sus servicios y reseñas, horario del profesional y cálculo de
 * disponibilidad — cuatro consultas, dos de ellas encadenadas. Y es
 * también la que más se abre desde `/buscar`, así que la espera se
 * paga en cada clic de un resultado.
 *
 * El esqueleto reproduce la silueta real (galería + cabecera + tabs +
 * lista de servicios) para que no haya salto de layout al resolver.
 */
export default async function ProviderDetailLoading() {
  const t = await getTranslations('common');

  return (
    <div
      className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-6 md:px-8 md:py-10"
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label={t('loading')}
      data-component="provider-detail-loading"
    >
      <Skeleton className="h-3 w-56 max-w-full rounded-full" />

      <Skeleton className="aspect-[16/9] w-full rounded-3xl md:aspect-[21/9]" />

      <div className="flex flex-col gap-3">
        <Skeleton className="h-9 w-2/3 rounded-full" />
        <Skeleton className="h-4 w-1/2 rounded-full" />
        <div className="flex flex-wrap gap-2">
          <Skeleton className="h-7 w-24 rounded-full" />
          <Skeleton className="h-7 w-20 rounded-full" />
          <Skeleton className="h-7 w-28 rounded-full" />
        </div>
      </div>

      <div className="flex gap-2">
        <Skeleton className="h-10 w-28 rounded-full" />
        <Skeleton className="h-10 w-28 rounded-full" />
        <Skeleton className="h-10 w-28 rounded-full" />
      </div>

      <div className="flex flex-col gap-3">
        {Array.from({ length: PLACEHOLDER_SERVICES }, (_, index) => (
          <div key={index} className="border-border flex items-center gap-4 rounded-2xl border p-4">
            <div className="flex flex-1 flex-col gap-2">
              <Skeleton className="h-4 w-2/5 rounded-full" />
              <Skeleton className="h-3 w-1/4 rounded-full" />
            </div>
            <Skeleton className="h-9 w-24 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
