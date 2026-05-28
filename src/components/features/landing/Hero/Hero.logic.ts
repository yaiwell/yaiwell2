'use client';

import { useCallback, useState, type FormEvent } from 'react';

import { useUserLocation } from '@/components/shared/UserLocationProvider';
import { useRouter } from '@/i18n/navigation';
import type { Suggestion } from '@/lib/fake-data/search-suggestions';
import { readLocationCookie } from '@/lib/services/location';

import type { HeroCategorySlug, HeroSearchDraft, HeroWhenOption } from './Hero.types';

/**
 * Hook que gestiona el formulario de búsqueda del Hero.
 *
 * Decisión: no llamamos al servicio de búsqueda aquí; solo construimos la
 * URL de `/buscar` con los `searchParams` correspondientes y delegamos en
 * la página de búsqueda (que la implementa otro agente en paralelo). Así
 * evitamos acoplar la landing al módulo `@/lib/services/providers` antes
 * de que esté publicado.
 */
export function useHeroSearch() {
  const router = useRouter();

  // Consumimos el provider global de ubicación. Nos sirve para:
  //  - Saber si ya tenemos GPS real (auto-completar "Cerca de ti").
  //  - Pedir el permiso si el usuario pulsa "Usar mi ubicación".
  const { status: locationStatus, hasRealLocation, request: requestLocation } = useUserLocation();

  const [draft, setDraft] = useState<HeroSearchDraft>({
    category: '',
    location: '',
    useNearMe: false,
    when: 'now',
  });

  const setCategory = useCallback((category: HeroCategorySlug | '') => {
    setDraft((prev) => ({ ...prev, category }));
  }, []);

  const setLocation = useCallback((location: string) => {
    // Cualquier edición manual del texto desactiva el modo "cerca de mí"
    // para evitar inconsistencia entre lo que el usuario ve y lo que se
    // envía a la URL.
    setDraft((prev) => ({ ...prev, location, useNearMe: false }));
  }, []);

  const setWhen = useCallback((when: HeroWhenOption) => {
    setDraft((prev) => ({ ...prev, when }));
  }, []);

  /**
   * Activa el modo "Cerca de ti". Si el navegador todavía no nos ha
   * concedido la ubicación, disparamos el flujo de permiso del provider
   * global; tras el `await` consultamos la cookie persistida (la escribe
   * el provider antes de resolver) para saber si la concesión fue real.
   * Es más fiable que leer `hasRealLocation` del closure, que aún no se
   * habrá actualizado en este tick de React.
   */
  const useMyLocation = useCallback(async () => {
    if (hasRealLocation) {
      setDraft((prev) => ({ ...prev, useNearMe: true, location: '' }));
      return;
    }
    await requestLocation();
    const fresh = readLocationCookie();
    if (fresh && fresh.source !== 'fallback') {
      setDraft((prev) => ({ ...prev, useNearMe: true, location: '' }));
    }
  }, [hasRealLocation, requestLocation]);

  const clearNearMe = useCallback(() => {
    setDraft((prev) => ({ ...prev, useNearMe: false }));
  }, []);

  /**
   * Compone la URL de búsqueda y navega.
   * Solo añadimos query params que tengan valor para mantener URLs limpias.
   *
   *  - `near=me`: filtra por proximidad usando la ubicación del provider.
   *  - `q=...`: búsqueda textual por nombre/dirección.
   *  - `now=1`: alias legacy de `when=now` (lo seguimos enviando porque
   *    el SearchView aún lo lee directamente).
   *  - `when=...`: cualquier otra ventana temporal distinta a "ahora"
   *    o "cualquier día" (que es el default y no necesita param).
   */
  const handleSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const params = new URLSearchParams();
      if (draft.category) params.set('cat', draft.category);

      if (draft.useNearMe) {
        params.set('near', 'me');
      } else if (draft.location.trim()) {
        params.set('q', draft.location.trim());
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
   * Mantenemos las query params actuales del Hero (categoría seleccionada
   * en el dropdown, "ahora") solo en la navegación a `/buscar`, no en
   * fichas de proveedor (no aplican).
   */
  const handleSelectSuggestion = useCallback(
    (suggestion: Suggestion) => {
      if (suggestion.type === 'category') {
        const params = new URLSearchParams();
        params.set('cat', suggestion.slug);
        if (draft.when === 'now') params.set('now', '1');
        else if (draft.when !== 'any') params.set('when', draft.when);
        if (draft.useNearMe) params.set('near', 'me');
        router.push(`/buscar?${params.toString()}`);
        return;
      }
      const segment = `${suggestion.providerSlug}-${suggestion.providerId}`;
      router.push(`/centro/${segment}`);
    },
    [draft.when, draft.useNearMe, router],
  );

  return {
    draft,
    locationStatus,
    hasRealLocation,
    setCategory,
    setLocation,
    setWhen,
    useMyLocation,
    clearNearMe,
    handleSubmit,
    handleSelectSuggestion,
  };
}
