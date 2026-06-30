import { z } from 'zod';

/**
 * Schemas de entrada para las acciones del admin.
 *
 * El `notes` de rechazo tiene un mínimo de 5 caracteres para evitar
 * rechazos opacos ("ok", ".") que no informarían al proveedor cuando
 * llegue la notificación por email (Fase 1 — emails Resend).
 */

export const approveProviderSchema = z.object({
  providerId: z.uuid('El providerId debe ser un UUID válido.'),
  notes: z.string().max(1000).optional(),
});

export const rejectProviderSchema = z.object({
  providerId: z.uuid('El providerId debe ser un UUID válido.'),
  notes: z
    .string()
    .min(5, 'El motivo de rechazo debe explicar el porqué (mín. 5 caracteres).')
    .max(1000, 'El motivo de rechazo supera los 1000 caracteres.'),
});

export type ApproveProviderInput = z.infer<typeof approveProviderSchema>;
export type RejectProviderInput = z.infer<typeof rejectProviderSchema>;
