import type { Suggestion } from '@/lib/fake-data/search-suggestions';

export interface SearchBarProps {
  /** Valor inicial controlado por la URL. */
  initialValue?: string;
  /** Callback al confirmar (Enter o blur con debounce) — actualiza la URL. */
  onSubmit: (value: string) => void;
  /**
   * Locale activo para que el autocomplete escoja el texto localizado
   * de las sugerencias (categorías y servicios en es/ca).
   */
  locale: 'es' | 'ca';
  /**
   * Manejador opcional para cuando el usuario elige una sugerencia
   * (categoría, servicio o proveedor). El caller decide la navegación.
   */
  onSelectSuggestion?: (suggestion: Suggestion) => void;
}
