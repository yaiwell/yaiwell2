import { z } from 'zod';

/**
 * Validación del input de sugerencias del autocomplete.
 *
 * Decisiones:
 *  - `q` mínimo 1 carácter en el schema (el límite de 2 chars vive en
 *    la propia función de búsqueda fake, para no acoplar el contrato
 *    HTTP a una heurística que puede cambiar). Si el caller manda 1
 *    carácter el servicio simplemente devuelve `[]`.
 *  - Longitud máxima de 120 para alinear con el límite del buscador
 *    full-text y evitar peticiones degeneradas.
 *  - `lang` opcional con default `'es'` porque la URL del autocomplete
 *    a veces no llega con `lang` (caller antiguo, prefetch, etc.).
 */

export const suggestionsQuerySchema = z.object({
  q: z
    .string()
    .trim()
    .min(1, 'Falta el parámetro `q`.')
    .max(120, 'La consulta es demasiado larga.'),
  lang: z.enum(['es', 'ca', 'en', 'de']).optional().default('es'),
});

export type ParsedSuggestionsQuery = z.infer<typeof suggestionsQuerySchema>;
