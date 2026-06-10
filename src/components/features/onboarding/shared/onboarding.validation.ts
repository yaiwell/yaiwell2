/**
 * Schemas Zod por paso del wizard.
 *
 * Se usan en el cliente (validación inline antes de habilitar el botón
 * "Siguiente") y como contrato compartido con el backend. El backend
 * tiene su propio set en `provider-onboarding.validation.ts` con reglas
 * equivalentes; replicamos aquí lo justo para validar el draft.
 */

import { z } from 'zod';

/** Regex del slug: minúsculas, dígitos y guiones — sin guiones laterales. */
export const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Regex laxo para VAT (NIF/CIF). 8-12 alfanuméricos en mayúsculas. */
export const VAT_REGEX = /^[A-Z0-9]{8,12}$/;

/** Schema del paso 1 — elección del tipo de negocio. */
export const businessTypeStepSchema = z.object({
  businessType: z.enum(['autonomo', 'centro']),
});

/** Schema del paso 2 — datos del negocio. */
export const businessDataStepSchema = z.object({
  businessName: z.string().min(2, 'requiredField').max(120),
  slug: z.string().min(3).max(60).regex(SLUG_REGEX, 'slugInvalid'),
  // VAT es opcional; si llega vacío, lo aceptamos. Si llega, debe cumplir el regex.
  vatNumber: z
    .string()
    .transform((v) => v.trim().toUpperCase())
    .refine((v) => v === '' || VAT_REGEX.test(v), { message: 'vatInvalid' })
    .optional(),
  description: z.string().min(1).max(280),
  priceRange: z.enum(['€', '€€', '€€€']),
});

/** Schema del paso 3 — ubicación. */
export const locationStepSchema = z.object({
  address: z.string().min(5).max(300),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

/** Schema del paso 4 — categoría y primer servicio. */
export const categoriesServiceStepSchema = z.object({
  categoryId: z.string().uuid(),
  serviceName: z.string().min(2).max(120),
  serviceDescription: z.string().max(2000).optional(),
  serviceDurationMinutes: z.number().int().min(5).max(480),
  // Precio en euros (la UI guarda euros para el usuario). Se convierte
  // a céntimos justo antes de mandarlo al backend.
  servicePriceEuros: z.number().min(0).max(10_000),
});

/** Schema del paso 5 — confirmación. */
export const confirmStepSchema = z.object({
  termsAccepted: z.literal(true),
});
