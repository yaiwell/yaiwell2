import type { LocalizedText, RootCategoryRef } from '@/types/domain';

/**
 * Nodo de la cadena de ancestros de una categoría, tal y como lo
 * devuelve el `select` anidado de Prisma.
 *
 * `name` llega como `Json` (unknown) porque la columna es JSONB y puede
 * traer traducciones parciales; lo normalizamos al mapear.
 *
 * `parent` es `undefined` cuando el `select` no bajó otro nivel más y
 * `null` cuando la relación no existe en BD. Los dos casos se tratan
 * igual: no podemos seguir subiendo.
 */
export interface CategoryChainNode {
  id: string;
  slug: string;
  name: unknown;
  parentId: string | null;
  parent?: CategoryChainNode | null;
}

/**
 * Profundidad máxima de la jerarquía de categorías (raíz → tipo →
 * subtipo). El `select` del repositorio baja exactamente estos niveles,
 * y el bucle de resolución usa el mismo tope como red de seguridad ante
 * un ciclo en los datos.
 */
export const MAX_CATEGORY_DEPTH = 3;

/**
 * Resuelve la categoría **raíz** de un servicio subiendo por la cadena
 * `parent` hasta el ancestro sin padre.
 *
 * La cadena llega precargada desde BD (join en la misma query), así que
 * esto es un recorrido en memoria: no hay lecturas adicionales por
 * servicio. Resolver contra el catálogo estático de `fake-data` no vale:
 * los ids de BD son UUIDs generados en el seed y nunca coinciden con los
 * ids `cat-*` del fake-data.
 *
 * @param category — categoría hoja (o intermedia) con sus ancestros.
 * @returns la raíz como `RootCategoryRef`, o `null` si la cadena está
 *   incompleta (categoría huérfana o jerarquía más profunda de lo
 *   previsto).
 */
export function resolveRootCategory(
  category: CategoryChainNode | null | undefined,
): RootCategoryRef | null {
  let current: CategoryChainNode | null | undefined = category;
  let hops = 0;

  while (current && current.parentId !== null && hops < MAX_CATEGORY_DEPTH) {
    current = current.parent;
    hops += 1;
  }

  if (!current || current.parentId !== null) return null;

  return {
    id: current.id,
    slug: current.slug,
    name: normalizeLocalizedName(current.name),
  };
}

/**
 * Normaliza el `name` JSONB de una categoría al `LocalizedText` del
 * dominio. Tolera filas con solo `es`/`ca` (el catálogo se sembró sin
 * inglés ni alemán) para que `pickLocalized` aplique su fallback.
 */
function normalizeLocalizedName(raw: unknown): LocalizedText {
  const name = (raw ?? {}) as Partial<LocalizedText>;
  return {
    es: name.es ?? '',
    ca: name.ca ?? '',
    en: name.en,
    de: name.de,
  };
}
