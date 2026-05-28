'use client';

import { useCallback, useState, type FormEvent } from 'react';

import { useUserLocation } from '@/components/shared/UserLocationProvider';
import { useRouter } from '@/i18n/navigation';
import type { Suggestion } from '@/lib/fake-data/search-suggestions';
import { readLocationCookie } from '@/lib/services/location';

import type {
  HeroCategorySlug,
  HeroLocationOption,
  HeroSearchDraft,
  HeroWhenOption,
} from './Hero.types';

/**
 * Mapea cada opción del selector "¿Dónde?" al texto que viaja en el
 * query param `q`. `near-me` y `any` no usan `q` (se gestionan aparte).
 *
 * Centralizado para que el día que tengamos catálogo real de ciudades
 * sólo haya un sitio que actualizar.
 */
const LOCATION_QUERY: Record<Exclude<HeroLocationOption, 'any' | 'near-me'>, string> = {
  barcelona: 'Barcelona',
  castellar: 'Castellar del Vallès',
  'llica-vall': 'Lliçà de Vall',
};

/**
 * Hook que gestiona el formulario de búsqueda del Hero.
 *
 * Decisión: no llamamos al servicio de búsqueda aquí; solo construimos la
 * URL de `/buscar` con los `searchParams` correspondientes y delegamos en
 * la página de búsqueda. Así evitamos acoplar la landing al módulo
 * `@/lib/services/providers`.
 */
export function useHeroSearch() {
  const router = useRouter();

  // Consumimos el provider global de ubicación para poder pedir el
  // permiso cuando el usuario elige "Cerca de ti" sin tenerlo aún.
  const { status: locationStatus, hasRealLocation, request: requestLocation } = useUserLocation();

  const [draft, setDraft] = useState<HeroSearchDraft>({
    category: '',
    location: 'any',
    when: 'now',
  });

  const setCategory = useCallback((category: HeroCategorySlug | '') => {
    setDraft((prev) => ({ ...prev, category }));
  }, []);

  /**
   * Cambia la zona seleccionada. Si el usuario elige "Cerca de ti" y aún
   * no tiene ubicación real, disparamos el permiso del provider. Si lo
   * deniega, dejamos la opción seleccionada para que vea el aviso
   * inline ("sin permiso") y pueda probar otra zona.
   */
  const setLocation = useCallback(
    async (location: HeroLocationOption) => {
      setDraft((prev) => ({ ...prev, location }));
      if (location === 'near-me' && !hasRealLocation) {
        await requestLocation();
        // Releemos la cookie escrita por el provider antes de resolver
        // para confirmar la concesión sin esperar al siguiente render.
        const fresh = readLocationCookie();
        if (!fresh || fresh.source === 'fallback') {
          // Permiso denegado/desconocido: la UI mostrará el sub-label
          // de "sin permiso" gracias a `locationStatus`.
        }
      }
    },
    [hasRealLocation, requestLocation],
  );

  const setWhen = useCallback((when: HeroWhenOption) => {
    setDraft((prev) => ({ ...prev, when }));
  }, []);

  /**
   * Compone la URL de búsqueda y navega.
   * Solo añadimos query params que tengan valor para mantener URLs limpias.
   *
   *  - `near=me`: filtra por proximidad usando la ubicación del provider.
   *  - `q=...`: texto a buscar (nombre de zona predefinida).
   *  - `now=1`: alias legacy de `when=now`.
   *  - `when=...`: cualquier otra ventana temporal.
   */
  const handleSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const params = new URLSearchParams();
      if (draft.category) params.set('cat', draft.category);

      if (draft.location === 'near-me') {
        params.set('near', 'me');
      } else if (draft.location !== 'any') {
        params.set('q', LOCATION_QUERY[draft.location]);
      }

      if (draft.when === 'now') {
        params.set('now', '1');
      } else if (draft.when !== 'any') {
        params.set('when', draft.when);
      }

      const qs = params.toString();
      router.push(qs ? `/buscar?${qs}` : '/buscar');
    },
    [draft, router],
  );

  /**
   * Navega directamente al seleccionar una sugerencia del autocomplete.
   *  - categoría → `/buscar?cat=slug`.
   *  - servicio/proveedor → ficha del proveedor `/centro/[slug]-[id]`.
   *
   * Conservamos la zona y la ventana temporal en la URL para no perder
   * el contexto del Hero al saltar a `/buscar`.
   */
  const handleSelectSuggestion = useCallback(
    (suggestion: Suggestion) => {
      if (suggestion.type === 'category') {
        const params = new URLSearchParams();
        params.set('cat', suggestion.slug);
        if (draft.location === 'near-me') params.set('near', 'me');
        else if (draft.location !== 'any') params.set('q', LOCATION_QUERY[draft.location]);
        if (draft.when === 'now') params.set('now', '1');
        else if (draft.when !== 'any') params.set('when', draft.when);
        router.push(`/buscar?${params.toString()}`);
        return;
      }
      const segment = `${suggestion.providerSlug}-${suggestion.providerId}`;
      router.push(`/centro/${segment}`);
    },
    [draft.location, draft.when, router],
  );

  return {
    draft,
    locationStatus,
    hasRealLocation,
    setCategory,
    setLocation,
    setWhen,
    handleSubmit,
    handleSelectSuggestion,
  };
}
