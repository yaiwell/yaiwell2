import { z } from 'zod';

import type { StorableLocalizedText } from '@/lib/i18n/localizedText';

/**
 * Schemas Zod de los textos localizados del dominio (`Service.name`,
 * `Service.description`, `Provider.description`…).
 *
 * Existe **una** fuente de verdad para no repetir la regla en cada
 * módulo: antes vivían copias en `provider-onboarding.validation.ts` y
 * `provider.validation.ts`, y ambas se conformaban con "al menos un
 * idioma". Ese "al menos uno" era exactamente el agujero por el que se
 * colaban servicios sin castellano, invisibles en la ficha pública.
 *
 * Aquí la regla es dura: **para guardar hace falta `es`**. El resto de
 * idiomas son opcionales porque llegan más tarde (traducción manual
 * desde el panel). Ver la justificación de producto en
 * `@/lib/i18n/localizedText`.
 */

/** Cota superior compartida: descripciones largas pero acotadas. */
const MAX_LENGTH = 2000;

/** Mensaje único para el caso "falta el castellano", en los dos modos de fallo. */
const MISSING_ES_MESSAGE =
  'El texto debe incluir la versión en castellano (`es`). Constrúyelo con buildLocalizedText() o ensureSpanish() de @/lib/i18n.';

/** Texto de un idioma concreto: recortado, no vacío y acotado. */
const translation = z.string().trim().min(1).max(MAX_LENGTH);

/**
 * Texto localizado **apto para persistir**: exige `es` con contenido.
 *
 * El `transform` final marca el resultado como `StorableLocalizedText`,
 * de forma que un repositorio que solo acepte ese tipo no pueda
 * recibir un objeto construido a mano en una action.
 */
export const storableLocalizedTextSchema = z
  .object({
    es: z
      .string({ error: MISSING_ES_MESSAGE })
      .trim()
      .min(1, { message: MISSING_ES_MESSAGE })
      .max(MAX_LENGTH),
    ca: translation.optional(),
    en: translation.optional(),
    de: translation.optional(),
  })
  .transform((value) => value as StorableLocalizedText);

/**
 * Parche de texto localizado: todas las claves opcionales.
 *
 * Solo válido como **entrada a una fusión** (el panel edita un idioma
 * y el service lo mezcla con lo guardado). El resultado de esa fusión
 * tiene que pasar por `ensureSpanish()` antes de llegar a BD — un
 * parche por sí solo nunca es guardable, y por eso su tipo de salida
 * no lleva la marca `StorableLocalizedText`.
 */
export const localizedTextPatchSchema = z.object({
  es: translation.optional(),
  ca: translation.optional(),
  en: translation.optional(),
  de: translation.optional(),
});

export type StorableLocalizedTextParsed = z.infer<typeof storableLocalizedTextSchema>;
export type LocalizedTextPatchParsed = z.infer<typeof localizedTextPatchSchema>;
