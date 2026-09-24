import type { AppLocale } from '@/i18n/routing';
import type { LocalizedText } from '@/types/domain';

import { EmptyLocalizedTextError } from './localizedText.errors';

/**
 * Constructores de `LocalizedText` **aptos para guardar en BD**.
 *
 * ## Por qué existe este módulo
 *
 * Durante meses los bordes de escritura del panel guardaban el texto
 * bajo la clave del locale activo y nada más (`{ [locale]: texto }`).
 * Un proveedor con el panel en catalán, inglés o alemán creaba
 * servicios **sin clave `es`**, y la lectura (`pickLocalized`) caía a
 * `text.es ?? ''`: nombre en blanco en la ficha pública, en el buscador
 * y en el flujo de reserva. Un servicio invendible sin un solo error en
 * los logs.
 *
 * La cura no es recordar rellenar `es` a mano en cada action: es que
 * **no exista forma de construir un texto guardable sin castellano**.
 * De ahí el tipo marcado `StorableLocalizedText`, que solo se obtiene
 * pasando por una de las funciones de aquí (o por
 * `storableLocalizedTextSchema` de `@/lib/validation`).
 *
 * ## Decisión de producto: qué va en `es` cuando el proveedor escribe en otro idioma
 *
 * **Duplicamos el texto del idioma activo en `es`.** Un nombre en
 * catalán o alemán visible para todo el mundo es infinitamente mejor
 * que un hueco en blanco: el cliente al menos puede leer, reconocer y
 * reservar el servicio. La alternativa (bloquear el alta hasta que el
 * proveedor escriba también en castellano) añade fricción en el
 * momento más frágil del onboarding, y la de traducir automáticamente
 * está descartada en MVP (sin APIs de IA, ver CLAUDE.md §2).
 *
 * Consecuencia asumida y visible: en `/es` puede aparecer un servicio
 * cuyo nombre está en alemán. Es el precio de no tener catálogo mudo.
 * Cuando exista el editor de traducciones (Fase 2) el proveedor podrá
 * sustituir ese duplicado por una traducción real.
 */

/**
 * Marca de tipo (no existe en runtime) que distingue un `LocalizedText`
 * **ya validado para guardar** de uno simplemente leído de BD.
 *
 * Al ser un `unique symbol` declarado sin implementación, ningún objeto
 * literal encaja en `StorableLocalizedText` por accidente: hay que
 * pasar por los constructores de este módulo. Eso convierte la regla
 * "siempre con castellano" en un error de compilación, no en un
 * comentario que alguien lee o no.
 */
declare const storableBrand: unique symbol;

/**
 * `LocalizedText` con la garantía de que `es` viene poblado y no vacío.
 * Es lo único que los repositorios deberían aceptar para persistir.
 */
export type StorableLocalizedText = LocalizedText & {
  readonly [storableBrand]: 'es-guaranteed';
};

/**
 * Limpia un `LocalizedText` parcial: recorta espacios y descarta las
 * claves vacías, que a efectos de lectura equivalen a "no traducido".
 *
 * Campo a campo a propósito (en vez de un bucle sobre `Object.keys`):
 * así el compilador avisa si algún día añadimos un quinto idioma.
 */
function sanitize(text: Partial<LocalizedText> | null | undefined): Partial<LocalizedText> {
  const result: Partial<LocalizedText> = {};
  const es = text?.es?.trim();
  const ca = text?.ca?.trim();
  const en = text?.en?.trim();
  const de = text?.de?.trim();
  if (es) result.es = es;
  if (ca) result.ca = ca;
  if (en) result.en = en;
  if (de) result.de = de;
  return result;
}

/**
 * Aplica un valor bajo la clave de un locale sin indexar por variable
 * en el resto del código (mantiene el punto de escritura localizado
 * aquí, donde está razonado y probado).
 */
function withLocale(
  base: Partial<LocalizedText>,
  locale: AppLocale,
  value: string,
): Partial<LocalizedText> {
  return { ...base, [locale]: value };
}

/**
 * Lee la traducción de un locale concreto. Un `switch` en vez de
 * `text[locale]` para que el único acceso indexado por variable del
 * proyecto siga siendo el de `pickLocalized` (ver la regla ESLint
 * `no-restricted-syntax` en `eslint.config.mjs`).
 */
function readLocale(text: Partial<LocalizedText>, locale: AppLocale): string | undefined {
  switch (locale) {
    case 'es':
      return text.es;
    case 'ca':
      return text.ca;
    case 'en':
      return text.en;
    case 'de':
      return text.de;
  }
}

/**
 * Construye un `LocalizedText` guardable a partir de un único texto
 * escrito en el locale activo del panel.
 *
 * Rellena `es` duplicando el texto cuando el locale no es castellano
 * (ver la decisión de producto en la cabecera del módulo).
 *
 * @param locale — locale en el que el proveedor ha escrito el texto.
 * @param value — texto crudo del formulario (se recorta).
 * @returns el texto localizado con `es` garantizado.
 * @throws EmptyLocalizedTextError si el texto está vacío tras recortar.
 */
export function buildLocalizedText(locale: AppLocale, value: string): StorableLocalizedText {
  const trimmed = value.trim();
  if (!trimmed) {
    throw new EmptyLocalizedTextError();
  }
  return withLocale({ es: trimmed }, locale, trimmed) as StorableLocalizedText;
}

/**
 * Fusiona la edición de **un** idioma sobre un texto ya guardado, sin
 * perder las traducciones de los demás.
 *
 * Dos matices que no son obvios:
 *  1. Si el registro venía sin `es` (dato anterior a este guardián),
 *     el texto editado pasa también a `es`: la edición es la
 *     oportunidad de curar el dato.
 *  2. Si `es` era un **duplicado espejo** del idioma que se está
 *     editando (lo que deja `buildLocalizedText` al crear en ca/en/de),
 *     lo actualizamos junto con él. Si no, el proveedor cambiaría el
 *     nombre alemán y el público seguiría viendo el alemán viejo.
 *     Un `es` distinto del idioma editado es una traducción real y no
 *     se toca.
 *
 * @param existing — texto tal como está en BD (puede venir incompleto).
 * @param locale — idioma que el proveedor está editando.
 * @param value — nuevo texto para ese idioma.
 * @throws EmptyLocalizedTextError si el texto está vacío tras recortar.
 */
export function mergeLocalizedText(
  existing: Partial<LocalizedText> | null | undefined,
  locale: AppLocale,
  value: string,
): StorableLocalizedText {
  const trimmed = value.trim();
  if (!trimmed) {
    throw new EmptyLocalizedTextError();
  }

  const base = sanitize(existing);
  // ¿El castellano guardado era un espejo del idioma que se edita?
  // Si lo era, no es una traducción: es el duplicado que dejó
  // `buildLocalizedText` y debe seguir al texto editado.
  const wasMirroredInSpanish = base.es !== undefined && base.es === readLocale(base, locale);

  const merged = withLocale(base, locale, trimmed);
  if (!merged.es || wasMirroredInSpanish) {
    merged.es = trimmed;
  }
  return merged as StorableLocalizedText;
}

/**
 * Garantiza el castellano en un `LocalizedText` que llega de fuera
 * (merge de parches, backfill de datos históricos, import).
 *
 * Si falta `es`, lo rellena con la primera traducción disponible en el
 * orden `ca → en → de`. Es el mismo criterio que la cadena de fallback
 * de `pickLocalized`, para que lo que se guarda y lo que se lee no
 * discrepen.
 *
 * @throws EmptyLocalizedTextError si no hay texto en ningún idioma.
 */
export function ensureSpanish(
  text: Partial<LocalizedText> | null | undefined,
): StorableLocalizedText {
  const sanitized = sanitize(text);
  if (sanitized.es) {
    return sanitized as StorableLocalizedText;
  }
  const fallback = sanitized.ca ?? sanitized.en ?? sanitized.de;
  if (!fallback) {
    throw new EmptyLocalizedTextError();
  }
  return { ...sanitized, es: fallback } as StorableLocalizedText;
}

/**
 * Variante tolerante de `ensureSpanish` para campos **opcionales**
 * (típicamente `description`): si no hay texto en ningún idioma
 * devuelve un objeto vacío en lugar de lanzar.
 *
 * Se usa cuando el formulario no toca el campo: no queremos romper un
 * guardado por una descripción que siempre estuvo vacía, pero sí
 * queremos curar el castellano si había texto en otro idioma.
 *
 * Devuelve el tipo marcado porque el vacío **cumple la garantía de
 * forma trivial**: la promesa es "si hay texto, hay castellano", y sin
 * texto no hay nada que pueda salir en blanco en la ficha pública.
 */
export function ensureSpanishIfAny(
  text: Partial<LocalizedText> | null | undefined,
): StorableLocalizedText {
  const sanitized = sanitize(text);
  if (Object.keys(sanitized).length === 0) {
    return sanitized as StorableLocalizedText;
  }
  return ensureSpanish(sanitized);
}

/**
 * Predicado de solo lectura: ¿este texto cumple ya la garantía?
 *
 * Útil en scripts de backfill y en tests para separar "hay que tocarlo"
 * de "ya está bien" sin duplicar la regla.
 */
export function hasSpanish(text: Partial<LocalizedText> | null | undefined): boolean {
  return Boolean(text?.es?.trim());
}
