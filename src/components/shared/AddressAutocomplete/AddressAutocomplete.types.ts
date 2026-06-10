import type { AppLocale } from '@/i18n/routing';

/**
 * Tipos del componente AddressAutocomplete.
 *
 * `AddressSelection` es el contrato mínimo que el consumidor necesita
 * cuando el usuario elige una dirección: texto completo legible más
 * coordenadas WGS84 para persistir en BD o pintar un marcador en mapa.
 * Mantener el shape independiente del proveedor (Mapbox/Google/...)
 * permite cambiar de backend sin tocar los formularios que lo usan.
 */
export interface AddressSelection {
  fullAddress: string;
  lat: number;
  lng: number;
  kind: string;
}

/**
 * Props públicas del componente.
 *
 * El input se controla **internamente** (no se expone `value`/`onChange`)
 * porque el patrón habitual es: el caller solo necesita la dirección
 * elegida, no cada keystroke. Si en el futuro hace falta sincronizar el
 * texto con un form externo, se añade una prop `value`+`onValueChange`
 * de forma aditiva.
 */
export interface AddressAutocompleteProps {
  /** Identificador opcional del input para asociar con labels externos. */
  id?: string;
  /** Etiqueta visible encima del input. Si falta, se usa `aria-label`. */
  label?: string;
  /** Placeholder mostrado en el input. */
  placeholder?: string;
  /** Locale activo para pedir resultados localizados al geocoder. */
  locale: AppLocale;
  /**
   * Filtro ISO 3166-1 alpha-2 para acotar el geocoder. Por defecto la
   * API ya aplica un país razonable; pasarlo aquí refuerza el filtro.
   */
  country?: string;
  /**
   * Punto de referencia para ordenar candidatos por cercanía. Mejora
   * notablemente la relevancia ("Calle Mayor" cerca del usuario).
   */
  proximity?: { lat: number; lng: number };
  /** Texto inicial mostrado en el input (sin disparar fetch). */
  initialValue?: string;
  /** Se dispara cuando el usuario confirma una dirección del listbox. */
  onSelect: (selection: AddressSelection) => void;
  /** Se dispara cuando el usuario limpia el input con el botón X. */
  onClear?: () => void;
  /** Deshabilita el input (e.g., mientras se guarda el form). */
  disabled?: boolean;
  /** Marca el input como required para validación nativa. */
  required?: boolean;
  /** Para asociar errores/ayudas externas al input. */
  ariaDescribedBy?: string;
}
