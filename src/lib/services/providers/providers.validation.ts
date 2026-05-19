import { z } from 'zod';

/**
 * Schemas Zod para validar los filtros de búsqueda en cada borde del
 * sistema (page que lee searchParams, futura API route, server action).
 *
 * Los valores se normalizan aquí: la UI puede enviar `'1'`/`'true'` y
 * obtenemos un booleano limpio; los rangos de precio llegan como string
 * separado por comas y se transforman a array.
 */

/**
 * Schema del rango de precio. Lo modelamos como un enum para que
 * cualquier valor distinto de '€', '€€' o '€€€' sea rechazado.
 */
const priceRangeSchema = z.enum(['€', '€€', '€€€']);

/**
 * Schema de un bounding box geográfico.
 * No restringimos latitud/longitud a rangos válidos del globo porque
 * para una demo en BCN no aporta nada — confiamos en la entrada del mapa.
 */
const geoBoundsSchema = z.object({
  north: z.number(),
  south: z.number(),
  east: z.number(),
  west: z.number(),
});

/**
 * Schema principal de filtros.
 *
 * Aceptamos tanto `availabilityOnly: true` como `'1'`/`'true'` desde
 * la URL: `z.coerce.boolean()` no nos sirve porque convierte cualquier
 * string no vacío en `true`, así que normalizamos a mano.
 */
export const searchProvidersFiltersSchema = z.object({
  query: z.string().trim().max(200).optional(),
  categorySlug: z.string().trim().max(100).optional(),
  availabilityOnly: z
    .union([z.boolean(), z.literal('1'), z.literal('true'), z.literal('0'), z.literal('false')])
    .transform((v) => v === true || v === '1' || v === 'true')
    .optional(),
  minRating: z.coerce.number().min(0).max(5).optional(),
  priceRange: z.array(priceRangeSchema).optional(),
  bounds: geoBoundsSchema.optional(),
  userLocation: z
    .object({
      lat: z.number(),
      lng: z.number(),
    })
    .optional(),
});

/**
 * Tipo derivado de la salida del schema (post-transformación).
 * Distinto del input: `availabilityOnly` aquí ya es `boolean | undefined`.
 */
export type SearchProvidersFiltersParsed = z.infer<typeof searchProvidersFiltersSchema>;
