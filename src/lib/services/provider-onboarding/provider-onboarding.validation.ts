/**
 * Schemas Zod del wizard de onboarding del proveedor (#57).
 *
 * Se aplican en cada borde del sistema (route handlers, server actions)
 * y también dentro del propio service como última línea de defensa. La
 * UI puede usar estos mismos schemas para validación inline.
 *
 * Convenciones:
 *  - `LocalizedText` exige al menos uno de los cuatro locales (es/ca/en/de).
 *    Es la regla de §6.bis de CLAUDE.md: la UI fija la lengua principal
 *    según el locale activo del wizard y el backend no asume cuál es.
 *  - El slug se valida con regex estricto (`a-z0-9-`) y longitud 3-60
 *    aunque el helper `slugifyBusinessName` ya devuelva algo conforme:
 *    nunca confiar en el cliente.
 *  - Las coordenadas en rango WGS84.
 */

import { z } from 'zod';

/**
 * Schema de un texto localizado: las cuatro claves son opcionales en
 * estructura, pero al menos una debe traer contenido. Es el patrón que
 * usa el resto del dominio (`Provider.description`, `Service.name`).
 */
const localizedTextSchema = z
  .object({
    es: z.string().min(1).max(2000).optional(),
    ca: z.string().min(1).max(2000).optional(),
    en: z.string().min(1).max(2000).optional(),
    de: z.string().min(1).max(2000).optional(),
  })
  .refine((d) => Boolean(d.es || d.ca || d.en || d.de), {
    message: 'Debe incluir texto en al menos un idioma.',
  });

/** Regex del slug: minúsculas, dígitos y guiones — sin guiones laterales. */
const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * Validación del paso 2: crear el Provider.
 *
 * `priceRange` usa los símbolos visibles (`€`, `€€`, `€€€`) y el
 * repositorio se encarga de mapearlos al enum Prisma (`euro`, `euro2`,
 * `euro3`). Mantener el contrato de API en los símbolos hace la API
 * más legible para clientes externos.
 */
export const createProviderSchema = z.object({
  type: z.enum(['autonomo', 'centro']),
  businessName: z.string().min(2).max(120),
  slug: z.string().min(3).max(60).regex(SLUG_REGEX, {
    message: 'El slug solo puede contener minúsculas, números y guiones.',
  }),
  description: localizedTextSchema,
  address: z.string().min(5).max(300),
  location: z.object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
  }),
  priceRange: z.enum(['€', '€€', '€€€']),
  email: z.string().email().optional(),
  phone: z.string().min(5).max(30).optional(),
});

export type CreateProviderParsed = z.infer<typeof createProviderSchema>;

/**
 * Validación del paso 3: subir fotos.
 *
 * Permitimos 0 fotos (el wizard ofrece "saltar este paso" para que el
 * proveedor cierre el alta y termine luego desde el panel) y máximo 6
 * para que la galería de la ficha quepa cómoda.
 */
export const updatePhotosSchema = z.object({
  photos: z.array(z.string().url()).max(6),
});

export type UpdatePhotosParsed = z.infer<typeof updatePhotosSchema>;

/**
 * Validación del paso 4: primer servicio.
 *
 * `durationMinutes`: 5 minutos como mínimo (slot mínimo razonable en
 * el motor de availability) y 480 (8 h) como máximo para evitar
 * sesiones absurdamente largas que romperían el cálculo de slots.
 *
 * `priceCents`: 0 (gratis, p. ej. consulta inicial) hasta 1.000.000
 * (10.000 €), cota técnica para no permitir overflows o typos.
 */
export const createFirstServiceSchema = z.object({
  categoryId: z.string().uuid(),
  name: localizedTextSchema,
  description: localizedTextSchema.optional(),
  durationMinutes: z.number().int().min(5).max(480),
  priceCents: z.number().int().min(0).max(1_000_000),
});

export type CreateFirstServiceParsed = z.infer<typeof createFirstServiceSchema>;

/** Validación del paso 5: selección de plan. */
export const selectPlanSchema = z.object({
  planTier: z.enum(['free', 'basic', 'pro', 'premium']),
});

export type SelectPlanParsed = z.infer<typeof selectPlanSchema>;
