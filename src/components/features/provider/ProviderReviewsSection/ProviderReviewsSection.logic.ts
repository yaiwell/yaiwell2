'use client';

import { useCallback, useState } from 'react';

/**
 * Hook que gestiona el estado colapsado/expandido de la lista de
 * reseñas. Lo extraemos del componente para mantener el JSX puro.
 *
 * @param totalReviews — número total de reseñas disponibles.
 * @param initialVisible — cuántas se ven por defecto (5).
 */
export function useReviewsCollapse(
  totalReviews: number,
  initialVisible: number = 5,
): {
  isExpanded: boolean;
  toggle: () => void;
  visibleCount: number;
  canExpand: boolean;
} {
  const [isExpanded, setIsExpanded] = useState(false);

  const toggle = useCallback(() => {
    setIsExpanded((prev) => !prev);
  }, []);

  // Solo permitimos expandir si hay más reseñas de las que se muestran
  // por defecto. Si no, el botón ni siquiera se renderiza.
  const canExpand = totalReviews > initialVisible;
  const visibleCount = isExpanded ? totalReviews : initialVisible;

  return { isExpanded, toggle, visibleCount, canExpand };
}

/**
 * Diccionario de unidades de tiempo en los locales soportados.
 * Lo definimos a mano porque `Intl.RelativeTimeFormat` devuelve
 * formas largas tipo "hace 2 semanas" y en la UI preferimos las
 * formas abreviadas ("hace 2 sem") para que el header de la
 * reseña respire mejor visualmente.
 */
const RELATIVE_DICT = {
  es: {
    now: 'hace un momento',
    day: { one: 'hace {n} día', other: 'hace {n} días' },
    week: { one: 'hace {n} sem', other: 'hace {n} sem' },
    month: { one: 'hace {n} mes', other: 'hace {n} meses' },
    year: { one: 'hace {n} año', other: 'hace {n} años' },
  },
  ca: {
    now: 'fa un moment',
    day: { one: 'fa {n} dia', other: 'fa {n} dies' },
    week: { one: 'fa {n} set', other: 'fa {n} set' },
    month: { one: 'fa {n} mes', other: 'fa {n} mesos' },
    year: { one: 'fa {n} any', other: 'fa {n} anys' },
  },
} as const;

/**
 * Formatea una fecha como tiempo relativo legible en es/ca.
 *
 * Usamos formas abreviadas para semanas porque la lista de reseñas
 * tiene poco espacio horizontal en mobile. Para el resto seguimos
 * las formas naturales del idioma.
 *
 * @param date — fecha de la reseña.
 * @param locale — locale activo de la UI.
 * @param now — referencia temporal; inyectable para tests.
 * @returns string ya localizado, listo para pintar.
 */
export function formatRelativeDate(
  date: Date,
  locale: 'es' | 'ca',
  now: Date = new Date(),
): string {
  const dict = RELATIVE_DICT[locale];
  const diffMs = now.getTime() - date.getTime();
  // Si la fecha es futura o muy reciente, tratamos como "ahora".
  if (diffMs < 60_000) {
    return dict.now;
  }

  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 1) {
    // Menos de un día completo: lo mostramos como "hoy" usando
    // la entrada `now` para evitar añadir otra clave al diccionario.
    return dict.now;
  }

  if (diffDays < 7) {
    return pickPlural(dict.day, diffDays);
  }

  if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7);
    return pickPlural(dict.week, weeks);
  }

  if (diffDays < 365) {
    const months = Math.floor(diffDays / 30);
    return pickPlural(dict.month, months);
  }

  const years = Math.floor(diffDays / 365);
  return pickPlural(dict.year, years);
}

/**
 * Selecciona la forma plural adecuada y sustituye el placeholder.
 * Mantiene el dict aislado de la lógica de plurales.
 */
function pickPlural(entry: { one: string; other: string }, n: number): string {
  const template = n === 1 ? entry.one : entry.other;
  return template.replace('{n}', String(n));
}
