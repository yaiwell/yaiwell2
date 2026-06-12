import 'server-only';

import type {
  CategoryRoot,
  CategorySubtype,
  CategoryType,
} from '@/components/features/provider-panel/AddServiceForm/AddServiceForm.types';
import { prisma } from '@/lib/db/prisma';
import type { LocalizedText } from '@/types/domain';

/**
 * Devuelve el árbol completo de categorías para el `AddServiceForm`.
 *
 * Una sola query trae todas las categorías; el árbol se construye en
 * memoria por `parentId` pivot. Es eficiente porque el catálogo es
 * pequeño (~60 entradas) y estable — no merece la pena un recursive
 * CTE ni vistas materializadas por idioma a estas alturas.
 *
 * Ordenado por slug en cada nivel para que el render sea estable
 * entre navegaciones.
 */
export async function getCategoriesTree(): Promise<CategoryRoot[]> {
  const all = await prisma.category.findMany({
    select: { id: true, slug: true, name: true, parentId: true },
    orderBy: { slug: 'asc' },
  });

  // Index por parentId para construir el árbol en O(n).
  const byParent = new Map<string | null, typeof all>();
  for (const cat of all) {
    const list = byParent.get(cat.parentId) ?? [];
    list.push(cat);
    byParent.set(cat.parentId, list);
  }

  const roots = byParent.get(null) ?? [];

  return roots.map<CategoryRoot>((root) => {
    const types = (byParent.get(root.id) ?? []).map<CategoryType>((type) => {
      const subtypes = (byParent.get(type.id) ?? []).map<CategorySubtype>((sub) => ({
        id: sub.id,
        slug: sub.slug,
        name: sub.name as unknown as LocalizedText,
      }));
      return {
        id: type.id,
        slug: type.slug,
        name: type.name as unknown as LocalizedText,
        subtypes,
      };
    });
    return {
      id: root.id,
      slug: root.slug,
      name: root.name as unknown as LocalizedText,
      types,
    };
  });
}
