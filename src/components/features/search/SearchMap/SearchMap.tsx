'use client';

import 'leaflet/dist/leaflet.css';

import L from 'leaflet';
import { useTranslations } from 'next-intl';
import { useEffect } from 'react';
import { MapContainer, Marker, TileLayer, useMap } from 'react-leaflet';

import { buildPinHtml, searchMapStyles as s } from './SearchMap.styles';
import type { SearchMapProps } from './SearchMap.types';

/**
 * Helper que vive dentro del MapContainer para acceder a la instancia
 * Leaflet vía `useMap()`. Observa el tamaño del contenedor y dispara
 * `invalidateSize()` cuando cambia.
 *
 * Necesario porque el mapa se monta oculto (pestaña "Lista" por
 * defecto) y Leaflet cachea el tamaño del contenedor en el primer
 * render. Sin esto, al cambiar a la pestaña "Mapa" las tiles no se
 * pintan completas y los clicks aterrizan en píxeles desfasados de
 * las coordenadas reales.
 */
function MapResizeHandler() {
  const map = useMap();

  useEffect(() => {
    const container = map.getContainer();

    // Forzamos un invalidateSize en el siguiente frame por si en el
    // momento del mount el contenedor aún era 0×0.
    const raf = requestAnimationFrame(() => map.invalidateSize());

    const observer = new ResizeObserver(() => {
      map.invalidateSize();
    });
    observer.observe(container);

    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
    };
  }, [map]);

  return null;
}

/**
 * Mapa Leaflet con pines de proveedores.
 *
 * Decisiones:
 *  - Tiles OSM gratuitos. Atribución visible en esquina inferior.
 *  - Pines custom con `L.divIcon`: HTML inline para poder colorear
 *    según disponibilidad y reaccionar a `highlightedId` sin recargar.
 *  - Sin `attributionControl` nativo de Leaflet (lo apagamos con
 *    `attributionControl={false}`) porque ya pintamos uno propio
 *    coherente con la estética stone.
 *
 * El componente se importa con `next/dynamic({ ssr: false })` desde
 * `SearchView` porque Leaflet accede a `window` durante el require.
 */
export function SearchMap({
  providers,
  initialCenter,
  initialZoom,
  highlightedId,
  onHoverProvider,
}: SearchMapProps) {
  const t = useTranslations('search.map');

  return (
    <div className={s.wrapper} data-component="search-map">
      <MapContainer
        center={[initialCenter.lat, initialCenter.lng]}
        zoom={initialZoom}
        scrollWheelZoom
        attributionControl={false}
        className="h-full w-full"
      >
        <MapResizeHandler />
        <TileLayer
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={19}
          attribution=""
        />
        {providers.map((p) => {
          const icon = L.divIcon({
            className: 'beauly-pin',
            html: buildPinHtml(p.availability.status, p.id === highlightedId),
            iconSize: [22, 22],
            iconAnchor: [11, 11],
          });
          return (
            <Marker
              key={p.id}
              position={[p.location.lat, p.location.lng]}
              icon={icon}
              eventHandlers={{
                mouseover: () => onHoverProvider(p.id),
                mouseout: () => onHoverProvider(null),
              }}
            />
          );
        })}
      </MapContainer>
      <span className={s.attribution} data-component="search-map-attribution">
        {t('attribution')}
      </span>
    </div>
  );
}

export default SearchMap;
