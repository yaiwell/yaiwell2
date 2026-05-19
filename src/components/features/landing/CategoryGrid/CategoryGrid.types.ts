import type { LucideIcon } from 'lucide-react';

import type { HeroCategorySlug } from '../Hero/Hero.types';

/**
 * Tipos del componente CategoryGrid.
 *
 * Cada categoría queda definida por: slug (clave i18n + valor de query
 * param hacia `/buscar?cat=...`), icono Lucide y foto de fondo verificada.
 */
export interface CategoryItem {
  slug: HeroCategorySlug;
  icon: LucideIcon;
  imageUrl: string;
}
