'use client';

import dynamic from 'next/dynamic';

/**
 * Wrapper cliente que carga el mini-mapa con `next/dynamic` y `ssr: false`.
 *
 * En Next.js 16 `dynamic({ ssr: false })` no se permite dentro de un
 * Server Component, por eso el import dinámico vive aquí, en un módulo
 * marcado como `'use client'`. Esto deja a `ProviderInfoPanel` libre
 * para seguir siendo Server Component.
 *
 * El loader es un skeleton del mismo tamaño para evitar layout shift
 * al hidratar; Leaflet accede a `window` y solo puede correr en cliente.
 */
const ProviderInfoMap = dynamic(() => import('./ProviderInfoMap').then((m) => m.ProviderInfoMap), {
  ssr: false,
  loading: () => (
    <div className="bg-muted h-[280px] w-full animate-pulse rounded-3xl md:h-[360px]" />
  ),
});

interface ProviderInfoMapLoaderProps {
  lat: number;
  lng: number;
}

export function ProviderInfoMapLoader({ lat, lng }: ProviderInfoMapLoaderProps) {
  return <ProviderInfoMap lat={lat} lng={lng} />;
}
