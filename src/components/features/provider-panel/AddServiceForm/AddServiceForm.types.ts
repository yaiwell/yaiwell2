/** Locales soportados en la UI del panel. */
export type SupportedLocale = 'es' | 'ca' | 'en' | 'de';

/** Props del formulario de alta de servicio. */
export interface AddServiceFormProps {
  locale: SupportedLocale;
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
