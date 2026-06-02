'use client';

import 'leaflet/dist/leaflet.css';

import L from 'leaflet';
import { useEffect } from 'react';
import { MapContainer, Marker, TileLayer, useMap } from 'react-leaflet';

import { buildPinHtml } from '@/components/features/search/SearchMap/SearchMap.styles';

import { providerInfoMapStyles as s } from './ProviderInfoMap.styles';
import type { ProviderInfoMapProps } from './ProviderInfoPanel.types';

/**
 * Handler interno que ajusta el tamaño del mapa cuando cambian las
 * dimensiones del contenedor.
 *
 * Replicamos el patrón de SearchMap porque el mini-mapa puede
 * montarse dentro de pestañas o secciones que cambian de visibilidad,
 * y Leaflet cachea el tamaño del contenedor en el primer render.
 * Sin esto los tiles aparecen recortados al cambiar de tab.
 */
function MapResizeHandler() {
  const map = useMap();

  useEffect(() => {
    const container = map.getContainer();
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
 * Mini-mapa con un único marker centrado en la ubicación del
 * proveedor. Se importa dinámicamente desde `ProviderInfoPanel`
 * porque Leaflet accede a `window` durante el require y rompería SSR.
 *
 * UX en la ficha: deshabilitamos `scrollWheelZoom` para que el
 * usuario pueda hacer scroll vertical de la página sin "atascarse"
 * al pasar por encima del mapa. El drag y el doble click sí se
 * permiten para que se pueda explorar el entorno.
 */
export function ProviderInfoMap({ lat, lng }: ProviderInfoMapProps) {
  // Pin con el mismo divIcon que el mapa de búsqueda para mantener
  // coherencia visual. Forzamos status `available_now` porque en
  // este contexto el pin solo marca ubicación, no estado real.
  const icon = L.divIcon({
    className: 'yeiwell-pin',
    html: buildPinHtml('available_now', false),
    iconSize: [22, 22],
    iconAnchor: [11, 11],
  });

  return (
    <MapContainer
      center={[lat, lng]}
      zoom={15}
      scrollWheelZoom={false}
      dragging
      doubleClickZoom
      zoomControl={false}
      attributionControl={false}
      className={s.container}
    >
      <MapResizeHandler />
      <TileLayer
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        maxZoom={19}
        attribution="© OpenStreetMap"
      />
      <Marker position={[lat, lng]} icon={icon} />
    </MapContainer>
  );
}

export default ProviderInfoMap;
