/**
 * Schemas Zod del módulo `provider` (operaciones de panel).
 *
 * Validan los inputs en cada borde del sistema (server actions, futuros
 * route handlers) y dentro del propio service como última línea de
 * defensa. Mantenemos las cotas conservadoras (mismas que `provider-onboarding`)
 * para no abrir agujeros al permitir updates con valores que el alta
 * rechazaría.
 */

import { z } from 'zod';

import { localizedTextPatchSchema } from '@/lib/validation/localized-text';

/**
 * Subset de `LocalizedText` aplicable al update de descripción del
 * panel. Las cuatro claves son opcionales en estructura — la UI hoy
 * solo edita la del locale activo y el service fusiona con las claves
 * existentes para no perder traducciones de otros idiomas.
 *
 * `min(1)` evita guardar strings vacíos bajo una clave (el merge prefiere
 * conservar lo existente si la nueva es vacía).
 */
const descriptionPatchSchema = localizedTextPatchSchema.optional();

/**
 * Validación de los campos editables desde `/panel/centro`.
 *
 * `address`, `lat` y `lng` **no** están aquí: los valida
 * `parseGeolocatedAddress` (`provider.address.ts`), que los convierte en
 * un único value object marcado. Separarlos permite devolver un error
 * tipado propio (`ProviderLocationRequiredError`) cuando lo que falta
 * son las coordenadas, en vez de un `ZodError` genérico que la UI no
 * podría distinguir de "revisa los campos".
 *
 * `contactPhone` y `contactEmail` son contacto privado para soporte
 * (migración 9g): vacíos se guardan como `null`. La ciudad y el código
 * postal no se guardan aparte: ya van en la dirección del geocoder.
 */
export const updateProviderSettingsSchema = z.object({
  businessName: z.string().trim().min(2).max(120),
  vatNumber: z
    .string()
    .trim()
    .max(30)
    .optional()
    .nullable()
    .transform((value) => (value && value.length > 0 ? value : null)),
  description: descriptionPatchSchema,
  // Dígitos, espacios, `+`, guiones y paréntesis; entre 6 y 32 caracteres.
  contactPhone: z
    .string()
    .trim()
    .max(32)
    .optional()
    .nullable()
    // `undefined` = no tocar; vacío = borrar (null).
    .transform((value) => (value === undefined ? undefined : value || null))
    .refine((value) => value == null || /^\+?[0-9 ()-]{6,32}$/.test(value), {
      message: 'Invalid phone',
    }),
  contactEmail: z
    .string()
    .trim()
    .max(254)
    .optional()
    .nullable()
    .transform((value) => (value === undefined ? undefined : value?.toLowerCase() || null))
    .refine((value) => value == null || z.email().safeParse(value).success, {
      message: 'Invalid email',
    }),
});

export type UpdateProviderSettingsParsed = z.infer<typeof updateProviderSettingsSchema>;
