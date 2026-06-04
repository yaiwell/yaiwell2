'use client';

import 'leaflet/dist/leaflet.css';

import L from 'leaflet';
import { useTranslations } from 'next-intl';
import { useEffect, useRef } from 'react';
import { MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet';

import type { GeoPoint } from '@/types/domain';

import { MapProviderPopup } from './MapProviderPopup';
import { buildPinHtml, buildUserLocationHtml, searchMapStyles as s } from './SearchMap.styles';
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
 * Vuelve a centrar el mapa cuando cambia la ubicación del usuario.
 *
 * Lo aislamos en un componente para tener acceso a `useMap()` y no
 * tener que envolver toda la lógica en una ref hacia el padre. Usamos
 * `flyTo` con duración corta para suavizar la transición cuando el
 * usuario acaba de conceder permisos y pasamos de fallback → GPS.
 *
 * En el primer render del mapa el centro ya viene de `initialCenter`,
 * por lo que esta llamada es idempotente y solo se nota cuando la
 * posición cambia de verdad (cookie nueva o GPS recién concedido).
 */
function MapUserLocationCenterer({ position }: { position: GeoPoint | undefined }) {
  const map = useMap();
  // Memorizamos lat/lng como primitivos para que el efecto solo se
  // dispare cuando cambia la posición de verdad, no cuando llega un
  // objeto nuevo con los mismos valores.
  const lat = position?.lat;
  const lng = position?.lng;

  // Guardamos la última posición a la que volamos para distinguir el
  // primer mount (donde el `initialCenter` del MapContainer ya pinta el
  // mapa centrado correctamente) de un cambio real de ubicación.
  const lastFlownTo = useRef<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    if (lat === undefined || lng === undefined) return;
    // Defensa contra NaN/Infinity: si las coordenadas no son finitas,
    // Leaflet hace `unproject(NaN)` dentro de `flyTo` y lanza
    // `Invalid LatLng object: (NaN, NaN)`, que en producción rompe el
    // árbol React entero (la página /buscar se quedaba en "this page
    // couldn't load"). Mejor no hacer nada y mantener el centro inicial.
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

    // Primer render: el MapContainer ya ha hecho el `center=` con estas
    // mismas coordenadas (initialCenter == userLocation), así que no
    // hay nada que "volar". Además, en el momento del mount el
    // contenedor puede medir 0×0 (sobre todo cuando la columna está
    // oculta en la pestaña "Lista" del móvil) y `flyTo` proyectaría
    // píxeles inexistentes a latlng NaN. Anotamos la posición y
    // salimos sin llamar a Leaflet.
    if (lastFlownTo.current === null) {
      lastFlownTo.current = { lat, lng };
      return;
    }

    // No volar si la posición no ha cambiado realmente.
    const last = lastFlownTo.current;
    if (last.lat === lat && last.lng === lng) return;

    // Última verificación: si el contenedor sigue sin tamaño (por
    // ejemplo, la pestaña Mapa nunca se ha abierto en móvil), aplazamos
    // el flyTo a la siguiente vez que cambie la posición.
    const size = map.getSize();
    if (size.x === 0 || size.y === 0) return;

    lastFlownTo.current = { lat, lng };
    map.flyTo([lat, lng], Math.max(map.getZoom(), 14), {
      duration: 0.6,
    });
  }, [map, lat, lng]);

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
 *  - El contenido del Popup vive en `MapProviderPopup` para mantener
 *    este archivo centrado en la composición Leaflet.
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
  onProviderSeeOnList,
  userLocation,
  hasRealLocation = true,
}: SearchMapProps) {
  const t = useTranslations('search.map');

  // Construimos el icono del marker del usuario solo si tenemos
  // ubicación. El HTML depende de si es GPS real (halo pulsante azul)
  // o fallback (pin neutro discreto con tooltip explicativo).
  const userIcon = userLocation
    ? L.divIcon({
        className: 'yaiwell-user-pin',
        html: buildUserLocationHtml(hasRealLocation),
        // Halo de hasta 44x44 cuando es real; mantenemos un tamaño
        // generoso para que el anchor no descoloque la posición.
        iconSize: [44, 44],
        iconAnchor: [22, 22],
      })
    : null;

  const userTooltip = hasRealLocation ? t('youAreHere') : t('fallbackCenter');

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
        <MapUserLocationCenterer position={userLocation} />
        <TileLayer
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={19}
          attribution=""
        />

        {userLocation && userIcon && (
          <Marker
            position={[userLocation.lat, userLocation.lng]}
            icon={userIcon}
            // El marker del usuario no es interactivo: solo informativo.
            // Bajamos su zIndexOffset para que cualquier pin de proveedor
            // que caiga encima quede por delante en clicabilidad.
            interactive
            keyboard={false}
            zIndexOffset={-100}
            title={userTooltip}
          >
            <Popup closeButton={false} offset={[0, -10]} className="yaiwell-map-popup">
              <span className="text-foreground block px-3 py-2 text-xs">{userTooltip}</span>
            </Popup>
          </Marker>
        )}

        {providers.map((p) => {
          const icon = L.divIcon({
            className: 'yaiwell-pin',
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
                // El click también resalta el pin (útil para que la lista
                // sepa cuál es el activo cuando vuelva a la pestaña).
                click: () => onHoverProvider(p.id),
              }}
            >
              <Popup closeButton autoPan offset={[0, -6]} className="yaiwell-map-popup">
                <MapProviderPopup
                  provider={p}
                  onPrimaryAction={
                    onProviderSeeOnList ? () => onProviderSeeOnList(p.id) : undefined
                  }
                  primaryActionLabel={t('popupCta')}
                />
              </Popup>
            </Marker>
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
