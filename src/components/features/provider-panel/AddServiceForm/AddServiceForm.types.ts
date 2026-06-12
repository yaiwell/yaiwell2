import type { LocalizedText } from '@/types/domain';

/** Locales soportados en la UI del panel. */
export type SupportedLocale = 'es' | 'ca' | 'en' | 'de';

/** Subtipo de servicio (nivel 3 — hoja del árbol). */
export interface CategorySubtype {
  id: string;
  slug: string;
  name: LocalizedText;
}

/** Tipo de servicio (nivel 2 — agrupa subtipos). */
export interface CategoryType {
  id: string;
  slug: string;
  name: LocalizedText;
  subtypes: CategorySubtype[];
}

/** Categoría raíz (nivel 1 — agrupa tipos). */
export interface CategoryRoot {
  id: string;
  slug: string;
  name: LocalizedText;
  types: CategoryType[];
}

/** Props del formulario de alta de servicio. */
export interface AddServiceFormProps {
  locale: SupportedLocale;
  /**
   * Árbol completo de categorías cargado server-side desde BD. El form
   * lo recibe por prop y nunca consulta BD desde cliente — la lista es
   * estable y de tamaño pequeño (~60 entradas).
   */
  categoriesTree: CategoryRoot[];
}

/**
 * Borrador del nuevo servicio que se va construyendo en el formulario.
 * Mantener todos los campos opcionales mientras el usuario los completa
 * facilita la lógica de cascada (categoría → tipo → subtipo).
 */
export interface AddServiceDraft {
  rootCategoryId: string | null;
  typeId: string | null;
  subtypeId: string | null;
  name: string;
  description: string;
  durationMinutes: string;
  priceEuros: string;
}
