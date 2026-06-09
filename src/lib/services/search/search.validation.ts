import { z } from 'zod';

/**
 * Validación del input de búsqueda.
 *
 * - Limitamos longitud y caracteres permitidos. El motor usa `$queryRaw`
 *   parametrizado (sin riesgo de SQL injection) pero la validación
 *   bloquea entradas degeneradas que romperían `websearch_to_tsquery`.
 * - El patrón acepta letras Unicode (`\p{L}`), dígitos, espacios, guiones,
 *   apóstrofes, comas, puntos y comillas — suficiente para `OR`, `-x`,
 *   `"frase exacta"` que entiende `websearch_to_tsquery`.
 */

const QUERY_PATTERN = /^[\p{L}\p{N}\s\-'",.]+$/u;

export const searchOptionsSchema = z.object({
  query: z
    .string()
    .trim()
    .min(1, 'La consulta no puede estar vacía.')
    .max(120, 'La consulta es demasiado larga.')
    .regex(QUERY_PATTERN, 'La consulta contiene caracteres no permitidos.'),
  language: z.enum(['es', 'ca']).optional().default('es'),
  limit: z.number().int().min(1).max(50).optional().default(20),
  offset: z.number().int().min(0).optional().default(0),
});

export type ParsedSearchOptions = z.infer<typeof searchOptionsSchema>;
