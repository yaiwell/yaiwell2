import { getTranslations } from 'next-intl/server';

import { Skeleton } from '@/components/ui/skeleton';

/** Cuatro tarjetas: las métricas semanales del dashboard. */
const PLACEHOLDER_METRICS = 4;

/** Tres bloques de contenido bajo las métricas (listas, agenda, formularios). */
const PLACEHOLDER_BLOCKS = 3;

/**
 * Estado de carga común a TODO el panel del proveedor.
 *
 * Un único archivo en la raíz de `/panel` cubre dashboard, calendario,
 * servicios, valoraciones y configuración del centro: las cinco páginas
 * comparten silueta (bloque de cabecera + tarjetas), así que replicar
 * el esqueleto por ruta solo añadiría ficheros que mantener.
 *
 * `/panel/centro` es el caso que más lo justifica: además de tres
 * consultas a Postgres espera a la API de Stripe, que deliberadamente
 * no se cachea porque el estado de la cuenta Connect puede cambiar en
 * cualquier momento.
 *
 * Nota: el layout del panel resuelve sesión y rol con `auth()`, que es
 * dato de runtime; Next no puede mostrar este fallback hasta que ese
 * layout termina. El esqueleto sirve sobre todo en la navegación entre
 * secciones del panel, donde el layout ya está montado y compartido.
 */
export default async function PanelLoading() {
  const t = await getTranslations('common');

  return (
    <div
      className="flex flex-col gap-6"
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label={t('loading')}
      data-component="panel-loading"
    >
      <Skeleton className="h-8 w-52 rounded-full" />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: PLACEHOLDER_METRICS }, (_, index) => (
          <div key={index} className="border-border flex flex-col gap-3 rounded-2xl border p-5">
            <Skeleton className="h-3 w-24 rounded-full" />
            <Skeleton className="h-7 w-16 rounded-full" />
            <Skeleton className="h-3 w-20 rounded-full" />
          </div>
        ))}
      </div>

      <div className="border-border flex flex-col gap-4 rounded-2xl border p-5">
        <Skeleton className="h-5 w-40 rounded-full" />
        {Array.from({ length: PLACEHOLDER_BLOCKS }, (_, index) => (
          <div key={index} className="flex items-center gap-4">
            <Skeleton className="size-10 shrink-0 rounded-xl" />
            <div className="flex flex-1 flex-col gap-2">
              <Skeleton className="h-4 w-2/5 rounded-full" />
              <Skeleton className="h-3 w-1/4 rounded-full" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
