import { z } from 'zod';

/**
 * Validación de entrada del dominio `payments`.
 *
 * La forma jurídica llega desde un formulario del cliente, así que no
 * la damos por buena aunque TypeScript diga que es `ConnectBusinessType`.
 */
export const connectBusinessTypeSchema = z.enum(['individual', 'company']);

/** Entrada de la action que inicia el alta en Stripe. */
export const startConnectOnboardingSchema = z.object({
  businessType: connectBusinessTypeSchema,
});

export type StartConnectOnboardingParsed = z.infer<typeof startConnectOnboardingSchema>;
