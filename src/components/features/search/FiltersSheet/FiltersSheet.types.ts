import type { PriceRange } from '@/types/domain';

/**
 * Forma de los filtros avanzados gestionados por el sheet.
 *
 * Se mantienen separados del estado "rápido" (chips de categoría y
 * toggle "ahora") porque su confirmación es explícita: el usuario edita,
 * pulsa "Aplicar" y el sheet se cierra. No queremos commits cada keypress.
 */
export interface AdvancedFiltersValue {
  priceRange: PriceRange[];
  minRating: number | null;
  /**
   * Solo huecos liberados con descuento (`?discount=1`). En el sheet solo
   * se enseña en móvil; desde `md` está en la barra.
   */
  discountOnly: boolean;
}

/** Qué limpia el botón "Limpiar" del sheet. */
export interface ClearAdvancedOptions {
  /**
   * `true` si el filtro "Con descuento" estaba a la vista en el sheet
   * (móvil) y por tanto también se limpia. En escritorio vive en la
   * barra y limpiar el sheet no debe tocarlo.
   */
  includeDiscount: boolean;
}

export interface FiltersSheetProps {
  /** Estado abierto/cerrado del sheet. Controlado por el padre. */
  open: boolean;
  /** Cambia el estado abierto. */
  onOpenChange: (next: boolean) => void;
  /** Valor actual de los filtros avanzados. */
  value: AdvancedFiltersValue;
  /** Aplica nuevos filtros y cierra el sheet. */
  onApply: (next: AdvancedFiltersValue) => void;
  /** Limpia los filtros avanzados del sheet. */
  onClear: (options: ClearAdvancedOptions) => void;
}
