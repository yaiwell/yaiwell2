'use client';

import { useCallback, useState, type FormEvent } from 'react';

import { useRouter } from '@/i18n/navigation';

import type { HeroCategorySlug, HeroSearchDraft } from './Hero.types';

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
  const [draft, setDraft] = useState<HeroSearchDraft>({
    category: '',
    location: '',
    whenNow: true,
  });

  const setCategory = useCallback((category: HeroCategorySlug | '') => {
    setDraft((prev) => ({ ...prev, category }));
  }, []);

  const setLocation = useCallback((location: string) => {
    setDraft((prev) => ({ ...prev, location }));
  }, []);

  const setWhenNow = useCallback((whenNow: boolean) => {
    setDraft((prev) => ({ ...prev, whenNow }));
  }, []);

  /**
   * Compone la URL de búsqueda y navega.
   * Solo añadimos query params que tengan valor para mantener URLs limpias.
   */
  const handleSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const params = new URLSearchParams();
      if (draft.category) params.set('cat', draft.category);
      if (draft.location.trim()) params.set('q', draft.location.trim());
      if (draft.whenNow) params.set('now', '1');

      const qs = params.toString();
      router.push(qs ? `/buscar?${qs}` : '/buscar');
    },
    [draft, router],
  );

  return {
    draft,
    setCategory,
    setLocation,
    setWhenNow,
    handleSubmit,
  };
}
