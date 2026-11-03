import { z } from 'zod';

import { weeklyScheduleSchema } from '@/lib/services/availability/availability.validation';

/** Límites de los campos del profesional (los comparte el formulario). */
export const PROFESSIONAL_NAME_MAX = 80;
export const PROFESSIONAL_BIO_MAX = 300;

/** Id de profesional o de servicio recibido de fuera (texto, no uuid nativo). */
export const teamIdSchema = z.string().trim().min(1).max(64);

/** Texto opcional: vacío o solo espacios cuenta como «sin dato». */
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullish()
    .transform((value) => (value ? value : null));

/**
 * Entrada de crear y editar un profesional. Se aplica en las server
 * actions (borde) y otra vez en el servicio.
 *
 * La foto llega como URL pública de Storage; que sea del propio negocio
 * lo comprueba el servicio (necesita el `providerId`).
 */
export const professionalInputSchema = z.object({
  name: z.string().trim().min(1).max(PROFESSIONAL_NAME_MAX),
  bio: optionalText(PROFESSIONAL_BIO_MAX),
  photo: z
    .string()
    .trim()
    .max(2048)
    .nullish()
    .transform((value) => (value ? value : null))
    .pipe(z.string().url().startsWith('https://').nullable()),
  schedule: weeklyScheduleSchema,
  serviceIds: z.array(teamIdSchema).max(500).default([]),
});

export type ProfessionalInputParsed = z.infer<typeof professionalInputSchema>;
