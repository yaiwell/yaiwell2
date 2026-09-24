import type { AppLocale } from '@/i18n/routing';
import type { LocalizedText } from '@/types/domain';

/**
 * Resuelve un `LocalizedText` al string del locale activo aplicando una
 * cadena de fallback predecible.
 *
 * Reglas:
 *  - Solo `es` está garantizado, y lo está porque **ningún borde de
 *    escritura puede guardar sin castellano** (ver
 *    `@/lib/i18n/localizedText` y `storableLocalizedTextSchema`).
 *  - `ca`, `en` y `de` son opcionales: el contenido de dominio empieza
 *    en el idioma en que escribe el proveedor y se traduce después.
 *  - El fallback preferente va al **castellano**: es la lengua puente
 *    que casi cualquier visitante de España entiende, mientras que
 *    mostrar catalán a un turista alemán sin paso intermedio sería peor
 *    experiencia.
 *  - Aun así seguimos la cadena `ca → en → de` si `es` faltara. No
 *    debería pasar, pero hay filas anteriores al guardián de escritura
 *    (ver `prisma/backfill-localized-es.ts`) y **un nombre en catalán
 *    es infinitamente mejor que un hueco en blanco**: el string vacío
 *    convertía un servicio en invendible sin dar un solo error.
 *
 * Esta función centraliza el fallback para que ningún componente
 * escriba `text[locale]` a mano — patrón prohibido por la regla ESLint
 * `no-restricted-syntax` de `eslint.config.mjs`.
 *
 * @param text — el `LocalizedText` a resolver.
 * @param locale — el locale activo (de `useLocale()` o del param de la ruta).
 * @returns el string para ese locale, o el primero disponible en la
 *   cadena de fallback; `''` solo si el texto está vacío en los cuatro.
 */
export function pickLocalized(text: LocalizedText, locale: AppLocale): string {
  // Único acceso indexado por variable permitido del proyecto: es
  // justamente el que esta función existe para encapsular.
  // eslint-disable-next-line no-restricted-syntax -- el guardián no puede saltarse a sí mismo; el fallback de abajo cubre las claves ausentes.
  const value = text[locale];
  if (typeof value === 'string' && value.length > 0) {
    return value;
  }
  return text.es || text.ca || text.en || text.de || '';
}
