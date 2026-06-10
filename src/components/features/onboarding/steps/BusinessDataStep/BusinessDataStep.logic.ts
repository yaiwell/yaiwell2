'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { apiCheckSlug, SLUG_REGEX } from '../../shared';

import type { SlugStatus } from './BusinessDataStep.types';

/** Retardo del debounce para `apiCheckSlug` en ms. */
const SLUG_CHECK_DEBOUNCE_MS = 400;

/** Longitudes válidas para el slug (espejo del backend). */
const SLUG_MIN_LENGTH = 3;
const SLUG_MAX_LENGTH = 60;

/**
 * Convierte un texto libre (nombre del negocio) en un slug compatible
 * con `SLUG_REGEX`: minúsculas, ASCII (sin tildes), guiones entre
 * tokens y sin guiones laterales. No incluye fallback aleatorio:
 * preferimos un slug vacío a uno sucio si el nombre no produce nada.
 */
export function slugifyBusinessName(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // quita diacríticos.
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, SLUG_MAX_LENGTH);
}

/**
 * Hook del paso 2.
 *
 * Responsabilidades:
 *  - Generar el slug al hacer blur del input de nombre del negocio si
 *    el usuario no lo personalizó manualmente.
 *  - Comprobar disponibilidad del slug contra `apiCheckSlug` con
 *    debounce de 400 ms.
 *  - Exponer un estado tipado (`SlugStatus`) que el JSX traduce a un
 *    helper visual con color (idle/checking/available/taken/invalid).
 */
export function useBusinessDataStep(params: {
  businessName: string;
  slug: string;
  slugStatus: SlugStatus;
  onSlugChange: (slug: string) => void;
  onSlugStatusChange: (status: SlugStatus) => void;
}) {
  const { businessName, slug, slugStatus, onSlugChange, onSlugStatusChange } = params;

  // Track de si el usuario tocó el slug manualmente. Si lo hizo, no
  // pisamos su valor en el blur de `businessName`.
  const [slugTouched, setSlugTouched] = useState(false);

  // Identificador estable de la última comprobación para descartar
  // respuestas obsoletas si el usuario sigue tecleando.
  const lastRequestIdRef = useRef(0);

  /**
   * Lanza la comprobación remota. Se llama desde el efecto de debounce
   * y también desde el blur del input. No bloquea: actualiza el estado
   * al volver la respuesta.
   */
  const checkSlugRemote = useCallback(
    async (candidate: string) => {
      const requestId = lastRequestIdRef.current + 1;
      lastRequestIdRef.current = requestId;
      onSlugStatusChange('checking');
      const result = await apiCheckSlug(candidate);
      // Si entre tanto se disparó otra request, descartamos la respuesta.
      if (lastRequestIdRef.current !== requestId) return;
      if ('error' in result) {
        // Tratamos cualquier error de red/servidor como "no determinable":
        // dejamos al usuario seguir y el create final volverá a validar.
        onSlugStatusChange('idle');
        return;
      }
      onSlugStatusChange(result.data.available ? 'available' : 'taken');
    },
    [onSlugStatusChange],
  );

  // Debounce de la comprobación cuando el slug cambia. Si el formato no
  // es válido marcamos `invalid` y NO disparamos fetch para no quemar
  // requests con strings que sabemos a priori que el backend rechaza.
  useEffect(() => {
    const trimmed = slug.trim();
    if (trimmed.length === 0) {
      onSlugStatusChange('idle');
      return;
    }
    if (
      trimmed.length < SLUG_MIN_LENGTH ||
      trimmed.length > SLUG_MAX_LENGTH ||
      !SLUG_REGEX.test(trimmed)
    ) {
      onSlugStatusChange('invalid');
      return;
    }
    const handle = window.setTimeout(() => {
      void checkSlugRemote(trimmed);
    }, SLUG_CHECK_DEBOUNCE_MS);
    return () => window.clearTimeout(handle);
  }, [slug, checkSlugRemote, onSlugStatusChange]);

  /**
   * Handler del blur del input "Nombre del negocio". Si el usuario no
   * ha tocado el slug, sembramos uno por defecto a partir del nombre
   * para ahorrarle el paso a la mayoría de los proveedores.
   */
  const handleBusinessNameBlur = useCallback(() => {
    if (slugTouched) return;
    const candidate = slugifyBusinessName(businessName);
    if (candidate.length >= SLUG_MIN_LENGTH && candidate !== slug) {
      onSlugChange(candidate);
    }
  }, [businessName, onSlugChange, slug, slugTouched]);

  /**
   * Handler del cambio manual del slug. Marca el campo como "tocado"
   * para que el blur del nombre deje de auto-rellenarlo.
   */
  const handleSlugChange = useCallback(
    (next: string) => {
      setSlugTouched(true);
      // Forzamos minúsculas y limitamos caracteres válidos en input
      // para que el feedback visual sea consistente con el regex.
      const sanitized = next.toLowerCase().replace(/[^a-z0-9-]/g, '');
      onSlugChange(sanitized);
    },
    [onSlugChange],
  );

  return {
    slugStatus,
    handleBusinessNameBlur,
    handleSlugChange,
  };
}
