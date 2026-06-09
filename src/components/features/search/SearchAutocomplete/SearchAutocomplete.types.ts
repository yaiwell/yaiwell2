import type { Suggestion } from '@/lib/fake-data/search-suggestions';

/**
 * Props del autocomplete del buscador.
 *
 * El componente es controlado: el caller le pasa el valor del input y
 * recibe los cambios. Así el mismo input puede vivir en la landing
 * (Hero) y en `/buscar` con flujos de navegación distintos.
 */
export interface SearchAutocompleteProps {
  /** Valor visible en el input. */
  value: string;
  /** Cambia el valor del input (cada keystroke). */
  onValueChange: (next: string) => void;
  /**
   * Confirma la búsqueda (Enter o tras seleccionar una sugerencia
   * de texto libre). El caller decide la navegación.
   */
  onSubmit: (value: string) => void;
  /**
   * Se dispara cuando el usuario selecciona una sugerencia tipada
   * (categoría, servicio, proveedor). El caller decide si navega
   * a la ficha, a `/buscar?cat=...` o copia el label al input.
   */
  onSelectSuggestion: (suggestion: Suggestion) => void;
  /** Placeholder mostrado en el input. */
  placeholder?: string;
  /** Aria-label del input (textual). */
  inputAriaLabel?: string;
  /** Locale activo para escoger el texto localizado de las sugerencias. */
  locale: 'es' | 'ca' | 'en' | 'de';
  /** Identificador opcional para el input (útil para asociar labels). */
  inputId?: string;
  /**
   * Si `true` (por defecto) envuelve el input en un `<form role="search">`
   * y maneja el submit con Enter. Si `false`, el caller controla el wrapper
   * (útil cuando el autocomplete se inserta dentro de otro form, como en
   * el Hero, para evitar formularios anidados que el HTML no permite).
   */
  renderAsForm?: boolean;
  /** Clases extra para el input (permite adaptarlo a contextos como el Hero). */
  inputClassName?: string;
}

/**
 * Resultado interno del hook: estado y handlers que el JSX consume.
 */
export interface UseSearchAutocompleteResult {
  suggestions: Suggestion[];
  isOpen: boolean;
  activeIndex: number;
  listboxId: string;
  optionId: (index: number) => string;
  inputRef: React.RefObject<HTMLInputElement | null>;
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  handleFocus: () => void;
  handleBlur: () => void;
  handleSelect: (suggestion: Suggestion) => void;
  handleSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
}
