/**
 * Schemas Zod del wizard de onboarding del proveedor (#57).
 *
 * Se aplican en cada borde del sistema (route handlers, server actions)
 * y también dentro del propio service como última línea de defensa. La
 * UI puede usar estos mismos schemas para validación inline.
 *
 * Convenciones:
 *  - `LocalizedText` exige **castellano**. El schema compartido
 *    `storableLocalizedTextSchema` vive en `@/lib/validation` y es la
 *    única fuente de verdad. Aquí había una copia local que se
 *    conformaba con "al menos un idioma": por ahí se colaban los
 *    centros y servicios dados de alta en ca/en/de, que nacían sin
 *    nombre ni descripción públicos (P0 nº 4 y nº 7 de
 *    `docs/pantallas-2026-09-23.md`). El cliente rellena `es`
 *    duplicando el idioma activo vía `buildLocalizedText`.
 *  - El slug se valida con regex estricto (`a-z0-9-`) y longitud 3-60
 *    aunque el helper `slugifyBusinessName` ya devuelva algo conforme:
 *    nunca confiar en el cliente.
 *  - Las coordenadas en rango WGS84.
 */

import { z } from 'zod';

import { storableLocalizedTextSchema } from '@/lib/validation';

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
  description: storableLocalizedTextSchema,
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
  name: storableLocalizedTextSchema,
  description: storableLocalizedTextSchema.optional(),
  durationMinutes: z.number().int().min(5).max(480),
  priceCents: z.number().int().min(0).max(1_000_000),
});

export type CreateFirstServiceParsed = z.infer<typeof createFirstServiceSchema>;

/** Validación del paso 5: selección de plan. */
export const selectPlanSchema = z.object({
  planTier: z.enum(['free', 'basic', 'pro', 'premium']),
});

export type SelectPlanParsed = z.infer<typeof selectPlanSchema>;
