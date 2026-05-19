import type { LucideIcon } from 'lucide-react';

import type { HeroCategorySlug } from '../Hero/Hero.types';

/**
 * Variantes de color pastel que rota la grid de categorías.
 * Cada variante mapea a un par de tokens (background suave + acento
 * saturado) definidos en globals.css.
 */
export type CategoryTone = 'rose' | 'sky' | 'peach' | 'sage' | 'butter' | 'lilac';

/**
 * Tipos del componente CategoryGrid.
 *
 * Cada categoría queda definida por: slug (clave i18n + valor de query
 * param hacia `/buscar?cat=...`), icono Lucide, foto Unsplash verificada
 * y tono pastel asignado.
 */
export interface CategoryItem {
  slug: HeroCategorySlug;
  icon: LucideIcon;
  tone: CategoryTone;
  imageUrl: string;
}
