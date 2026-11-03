'use server';

import { revalidatePath } from 'next/cache';
import { hasLocale } from 'next-intl';

import { redirect } from '@/i18n/navigation';
import { routing, type AppLocale } from '@/i18n/routing';
import { requireCurrentProvider } from '@/lib/auth/server';
import {
  createProfessional,
  deactivateProfessional,
  reactivateProfessional,
  teamIdSchema,
  updateProfessional,
} from '@/lib/services/team';
import type { WeeklySchedule } from '@/lib/services/availability';

import { teamFailure, type TeamActionState } from './actions.errors';

/**
 * Server actions del equipo (`/panel/equipo`).
 *
 * Todas trabajan con el `providerId` de la sesión
 * (`requireCurrentProvider`): un id de otro negocio sale `NOT_FOUND`.
 * La validación Zod la repite el servicio; aquí solo se validan el
 * `locale` (llega del cliente y acaba en rutas de `revalidatePath` y en
 * el `redirect`) y el id.
 */

/** Resultado para un `locale` que no es de la app. */
const INVALID_LOCALE: TeamActionState = { ok: false, code: 'VALIDATION' };

/** Formulario de profesional tal como lo envía el cliente. */
export interface ProfessionalRawInput {
  name: string;
  bio: string;
  /** URL pública de la foto subida, o `null` sin foto. */
  photo: string | null;
  schedule: WeeklySchedule;
  serviceIds: string[];
}

/** Revalida el listado y, si se indica, la ficha de un profesional. */
function revalidateTeam(locale: AppLocale, professionalId?: string) {
  revalidatePath(`/${locale}/panel/equipo`);
  if (professionalId) revalidatePath(`/${locale}/panel/equipo/${professionalId}`);
  // El selector «Quién lo presta» y el horario de «Mi negocio» dependen
  // de cuántos profesionales activos hay.
  revalidatePath(`/${locale}/panel/servicios`);
  revalidatePath(`/${locale}/panel/centro`);
}

/** Da de alta un profesional y vuelve al listado. */
export async function createProfessionalAction(
  locale: AppLocale,
  raw: ProfessionalRawInput,
): Promise<TeamActionState> {
  if (!hasLocale(routing.locales, locale)) return INVALID_LOCALE;
  const { id: providerId } = await requireCurrentProvider(locale);
  try {
    await createProfessional(providerId, raw);
  } catch (err) {
    return teamFailure(err, 'create');
  }
  revalidateTeam(locale);
  redirect({ href: '/panel/equipo', locale });
  // `redirect` lanza; este return solo satisface al type checker.
  return { ok: true };
}

/** Guarda los cambios de un profesional. */
export async function updateProfessionalAction(
  locale: AppLocale,
  professionalId: string,
  raw: ProfessionalRawInput,
): Promise<TeamActionState> {
  if (!hasLocale(routing.locales, locale)) return INVALID_LOCALE;
  const { id: providerId } = await requireCurrentProvider(locale);
  const id = teamIdSchema.safeParse(professionalId);
  if (!id.success) return { ok: false, code: 'NOT_FOUND' };
  try {
    await updateProfessional(providerId, id.data, raw);
  } catch (err) {
    return teamFailure(err, 'update');
  }
  revalidateTeam(locale, id.data);
  return { ok: true };
}

/**
 * Da de baja a un profesional. Si tiene citas futuras, devuelve la
 * lista para que el diálogo la enseñe.
 */
export async function deactivateProfessionalAction(
  locale: AppLocale,
  professionalId: string,
): Promise<TeamActionState> {
  if (!hasLocale(routing.locales, locale)) return INVALID_LOCALE;
  const { id: providerId } = await requireCurrentProvider(locale);
  const id = teamIdSchema.safeParse(professionalId);
  if (!id.success) return { ok: false, code: 'NOT_FOUND' };
  try {
    await deactivateProfessional(providerId, id.data);
  } catch (err) {
    return teamFailure(err, 'deactivate');
  }
  revalidateTeam(locale, id.data);
  return { ok: true };
}

/** Reactiva a un profesional dado de baja (si el plan lo permite). */
export async function reactivateProfessionalAction(
  locale: AppLocale,
  professionalId: string,
): Promise<TeamActionState> {
  if (!hasLocale(routing.locales, locale)) return INVALID_LOCALE;
  const { id: providerId } = await requireCurrentProvider(locale);
  const id = teamIdSchema.safeParse(professionalId);
  if (!id.success) return { ok: false, code: 'NOT_FOUND' };
  try {
    await reactivateProfessional(providerId, id.data);
  } catch (err) {
    return teamFailure(err, 'reactivate');
  }
  revalidateTeam(locale, id.data);
  return { ok: true };
}
