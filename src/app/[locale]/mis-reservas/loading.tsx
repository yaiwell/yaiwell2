import { getTranslations } from 'next-intl/server';

import { Skeleton } from '@/components/ui/skeleton';

/** Tres filas: lo que suele ocupar el bloque "próximas" sin scroll. */
const PLACEHOLDER_ROWS = 3;

/**
 * Estado de carga de `/mis-reservas`.
 *
 * La página resuelve el `User.id` desde Clerk (`ensureUserFromClerk`,
 * que puede escribir) y después consulta las reservas con sus relaciones.
 * Son dos viajes encadenados a Postgres sobre una pantalla que el
 * cliente abre desde el tab bar, así que la espera se nota.
 *
 * El esqueleto vive dentro del `CustomerShell` (lo monta el layout del
 * área cliente), de modo que la sidebar sigue navegable mientras carga.
 */
export default async function CustomerBookingsLoading() {
  const t = await getTranslations('common');

  return (
    <div
      className="flex flex-col gap-8"
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label={t('loading')}
      data-component="customer-bookings-loading"
    >
      <div className="flex flex-col gap-2">
        <Skeleton className="h-9 w-48 rounded-full" />
        <Skeleton className="h-4 w-72 max-w-full rounded-full" />
      </div>

      <div className="flex flex-col gap-4">
        <Skeleton className="h-5 w-40 rounded-full" />
        {Array.from({ length: PLACEHOLDER_ROWS }, (_, index) => (
          <div key={index} className="border-border flex items-center gap-4 rounded-2xl border p-4">
            <Skeleton className="size-14 shrink-0 rounded-xl" />
            <div className="flex flex-1 flex-col gap-2">
              <Skeleton className="h-4 w-2/5 rounded-full" />
              <Skeleton className="h-3 w-1/3 rounded-full" />
            </div>
            <Skeleton className="hidden h-9 w-24 rounded-full sm:block" />
          </div>
        ))}
      </div>
    </div>
  );
}
