/**
 * Schemas Zod del dominio de sanciones.
 */

import { z } from 'zod';

/** Longitud mínima del motivo de revocación: debe explicar algo en una auditoría. */
export const REVOKE_REASON_MIN_LENGTH = 5;
export const REVOKE_REASON_MAX_LENGTH = 500;

/**
 * Revocación de una sanción por soporte desde /admin. Quién revoca sale
 * de la sesión (rol admin comprobado en el borde), nunca del payload.
 */
export const revokeSanctionSchema = z.object({
  sanctionId: z.string().uuid(),
  reason: z.string().trim().min(REVOKE_REASON_MIN_LENGTH).max(REVOKE_REASON_MAX_LENGTH),
});

export type RevokeSanctionParsed = z.infer<typeof revokeSanctionSchema>;

/**
 * Filtro de la pantalla de sanciones de soporte (`?email=`). Llega de la
 * URL: un valor vacío o inválido se trata como «sin filtro».
 */
export const supportSanctionsFilterSchema = z.object({
  email: z
    .string()
    .trim()
    .max(254)
    .transform((value) => value || null)
    .nullish()
    .catch(null),
});
