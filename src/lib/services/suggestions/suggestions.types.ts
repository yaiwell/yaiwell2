/**
 * Tipos del dominio de sugerencias del autocomplete.
 *
 * Los tipos del *contenido* (categoría / servicio / proveedor) viven
 * en `@/lib/fake-data/search-suggestions` y se reexportan desde el
 * `index.ts` de este módulo. Aquí mantenemos solo lo específico del
 * transporte HTTP (idioma soportado, etc.).
 */

/** Idiomas soportados por el endpoint de sugerencias. */
export type SuggestionsLanguage = 'es' | 'ca' | 'en' | 'de';
