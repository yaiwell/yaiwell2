import type { RatingBreakdown } from './providers.types';

/**
 * Fila de recuento por nota tal y como la devuelve el `groupBy` de
 * Prisma una vez aplanada (`_count._all` → `count`).
 */
export interface RatingCountRow {
  rating: number;
  count: number;
}

/**
 * Desglose vacío: las cinco notas a cero.
 *
 * Lo usamos como punto de partida y como respuesta para proveedores sin
 * reseñas, para que la UI nunca reciba `undefined` en una de las claves.
 */
export function emptyRatingBreakdown(): RatingBreakdown {
  return { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
}

/**
 * Convierte el recuento agregado por nota en el `RatingBreakdown` del
 * dominio.
 *
 * Vive en un archivo propio (sin `server-only` ni Prisma) para poder
 * testearlo aislado: es la pieza que antes se calculaba sobre la
 * muestra de 20 reseñas y hacía que las barras no cuadrasen con el
 * total real de valoraciones.
 *
 * Las notas se normalizan al entero 1-5 más cercano por defensa: la
 * columna es `Int` con check en BD, pero el desglose no debe romperse
 * si alguna vez entra un 0 o un 7 por una migración futura.
 *
 * @param rows — recuentos por nota; se admiten notas repetidas (se suman).
 * @returns desglose completo con las cinco claves siempre presentes.
 */
export function toRatingBreakdown(rows: readonly RatingCountRow[]): RatingBreakdown {
  const breakdown = emptyRatingBreakdown();
  for (const row of rows) {
    const key = clampToStar(row.rating);
    breakdown[key] += row.count;
  }
  return breakdown;
}

/**
 * Total de reseñas contabilizadas en un desglose. Útil para validar
 * coherencia contra el contador denormalizado del proveedor.
 */
export function sumRatingBreakdown(breakdown: RatingBreakdown): number {
  return breakdown[1] + breakdown[2] + breakdown[3] + breakdown[4] + breakdown[5];
}

/** Normaliza cualquier número al entero 1-5 usado como clave del desglose. */
function clampToStar(rating: number): 1 | 2 | 3 | 4 | 5 {
  return Math.max(1, Math.min(5, Math.round(rating))) as 1 | 2 | 3 | 4 | 5;
}
