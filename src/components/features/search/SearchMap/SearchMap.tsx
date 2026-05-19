'use client';

import 'leaflet/dist/leaflet.css';

import L from 'leaflet';
import { useTranslations } from 'next-intl';
import { MapContainer, Marker, TileLayer } from 'react-leaflet';

import { buildPinHtml, searchMapStyles as s } from './SearchMap.styles';
import type { SearchMapProps } from './SearchMap.types';

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
    <div className={s.wrapper}>
      <MapContainer
        center={[initialCenter.lat, initialCenter.lng]}
        zoom={initialZoom}
        scrollWheelZoom
        attributionControl={false}
        className="h-full w-full"
      >
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
      <span className={s.attribution}>{t('attribution')}</span>
    </div>
  );
}

export default SearchMap;
