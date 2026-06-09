import type { AppLocale } from '@/i18n/routing';
import type { LocalizedText } from '@/types/domain';

/**
 * Resuelve un `LocalizedText` al string del locale activo aplicando una
 * cadena de fallback predecible.
 *
 * Reglas:
 *  - `es` y `ca` siempre vienen poblados (son requeridos en el tipo).
 *  - `en` y `de` pueden faltar porque el contenido de dominio (nombres
 *    de servicios, descripciones de proveedor) empieza en es/ca y se
 *    traduce a en/de en una fase posterior.
 *  - El fallback va al **castellano**, no al inglés: en Mallorca el
 *    castellano es la lengua puente que casi cualquier visitante
 *    entiende, mientras que mostrar un texto en catalán a un turista
 *    alemán sin traducción inglesa intermedia sería peor experiencia.
 *
 * Esta función centraliza el fallback para que ningún componente
 * tenga que escribir `text[locale] ?? text.es` a mano (donde el
 * indexer falla en TS porque `en`/`de` son opcionales).
 *
 * @param text — el `LocalizedText` a resolver.
 * @param locale — el locale activo (de `useLocale()` o del param de la ruta).
 * @returns el string para ese locale o el fallback castellano.
 */
export function pickLocalized(text: LocalizedText, locale: AppLocale): string {
  // Acceso directo: en/de pueden ser undefined, los requeridos no.
  const value = text[locale];
  if (typeof value === 'string' && value.length > 0) {
    return value;
  }
  // Fallback al castellano (siempre presente). Si por algún bug `es`
  // tampoco está, devolvemos string vacío para no romper el render.
  return text.es ?? '';
}
