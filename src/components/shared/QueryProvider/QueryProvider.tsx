'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';

import type { QueryProviderProps } from './QueryProvider.types';

/**
 * Provider de TanStack Query para toda la app.
 *
 * Cada cliente vive en estado local del provider para que en SSR no se
 * comparta el caché entre requests (regla oficial de TanStack Query con
 * Next App Router). En cliente sigue siendo singleton porque el provider
 * solo se monta una vez en el árbol.
 *
 * Defaults conservadores: `staleTime` de 30s para que los hooks de
 * búsqueda no refetcheen agresivamente mientras el usuario tipea, y
 * `refetchOnWindowFocus` desactivado para que volver a la pestaña no
 * dispare una request.
 */
export function QueryProvider({ children }: QueryProviderProps) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      }),
  );

  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
