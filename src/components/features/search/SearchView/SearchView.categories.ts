import type { AppLocale } from '@/i18n/routing';
import { pickLocalized } from '@/lib/i18n';
import type { LocalizedText } from '@/types/domain';

import type { SearchCategoriesData, SearchCategoryOption } from './SearchView.types';

/**
 * Forma mínima del árbol de categorías que necesitamos.
 *
 * Es estructural a propósito: encaja con lo que devuelve
 * `getCategoriesTree` (raíz → tipo → subtipo) sin acoplar el buscador a
 * los tipos del formulario del panel del proveedor.
 */
interface CategoryTreeLeaf {
  id: string;
  slug: string;
  name: LocalizedText;
}

interface CategoryTreeType extends CategoryTreeLeaf {
  subtypes: CategoryTreeLeaf[];
}

export interface CategoryTreeRoot extends CategoryTreeLeaf {
  types: CategoryTreeType[];
}

/**
 * Convierte el árbol de categorías de la BD en los datos planos que
 * necesita el buscador en cliente.
 *
 * Se ejecuta en servidor (la page) para que el cliente reciba solo
 * strings ya localizados: ni Prisma ni `LocalizedText` cruzan la
 * frontera, y el bundle no crece con el catálogo entero.
 *
 * Las raíces se ordenan por su nombre visible en el idioma activo: la
 * BD no guarda un orden editorial y el orden por slug ("estetica"
 * detrás de "deporte") no significa nada para el usuario.
 *
 * @param tree — árbol completo de `getCategoriesTree`.
 * @param locale — locale de la petición.
 * @param activeSlug — slug de `?cat=`, que puede ser de cualquier nivel.
 * @returns chips de raíz + etiqueta de la categoría activa.
 */
export function buildSearchCategories(
  tree: CategoryTreeRoot[],
  locale: AppLocale,
  activeSlug: string | null,
): SearchCategoriesData {
  const toOption = (node: CategoryTreeLeaf): SearchCategoryOption => ({
    id: node.id,
    slug: node.slug,
    label: pickLocalized(node.name, locale),
  });

  const roots = tree.map(toOption).sort((a, b) => a.label.localeCompare(b.label, locale));

  return { roots, activeLabel: findLabel(tree, activeSlug, locale) };
}

/**
 * Busca la etiqueta del slug activo recorriendo los tres niveles.
 * Hace falta porque la landing enlaza a subcategorías (`manicura-pedicura`)
 * que no están entre los chips pero sí deben mostrarse como filtro activo.
 */
function findLabel(
  tree: CategoryTreeRoot[],
  slug: string | null,
  locale: AppLocale,
): string | null {
  if (!slug) return null;
  for (const root of tree) {
    if (root.slug === slug) return pickLocalized(root.name, locale);
    for (const type of root.types) {
      if (type.slug === slug) return pickLocalized(type.name, locale);
      const sub = type.subtypes.find((s) => s.slug === slug);
      if (sub) return pickLocalized(sub.name, locale);
    }
  }
  return null;
}
