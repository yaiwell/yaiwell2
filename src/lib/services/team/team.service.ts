import 'server-only';

import { prisma } from '@/lib/db/prisma';

import {
  PlanProfessionalLimitError,
  ProfessionalInactiveError,
  ProfessionalNotFoundError,
  ProfessionalPhotoInvalidError,
  ServicesWouldBeUnstaffedError,
  TeamServicesInvalidError,
} from './team.errors';
import { teamRepository } from './team.repository';
import { findNewlyUnstaffed, isOwnProfessionalPhoto, withAssignment } from './team.rules';
import { applyAssignment, loadTeamSnapshot, published } from './team.snapshot';
import type { ProfessionalInput } from './team.types';
import { professionalInputSchema } from './team.validation';

/**
 * Alta y edición de profesionales del equipo (CLAUDE.md §4.bis
 * «Equipo»). La propiedad la garantiza el caller con el `providerId` de
 * la sesión; aquí todo se filtra por él.
 */

/** Valida la entrada y que los servicios elegidos son del negocio. */
async function parseInput(
  providerId: string,
  input: unknown,
  currentPhoto: string | null,
): Promise<ProfessionalInput> {
  const data = professionalInputSchema.parse(input);
  // Una foto que ya tenía (p. ej. del seed) se respeta; una nueva tiene
  // que venir de la subida del panel.
  if (
    data.photo &&
    data.photo !== currentPhoto &&
    !isOwnProfessionalPhoto(data.photo, providerId)
  ) {
    throw new ProfessionalPhotoInvalidError();
  }
  const serviceIds = [...new Set(data.serviceIds)];
  const owned = await teamRepository.countOwnServices(providerId, serviceIds);
  if (owned !== serviceIds.length) throw new TeamServicesInvalidError();
  return { ...data, serviceIds };
}

/**
 * Da de alta un profesional con su horario y sus servicios.
 *
 * @param providerId — negocio de la sesión.
 * @param input — entrada cruda; se valida con Zod.
 * @returns id del profesional creado.
 * @throws ZodError, ProfessionalPhotoInvalidError, TeamServicesInvalidError.
 * @throws PlanProfessionalLimitError si el plan no admite más activos.
 * @throws TeamProviderNotFoundError si el negocio no existe.
 */
export async function createProfessional(providerId: string, input: unknown): Promise<string> {
  const data = await parseInput(providerId, input, null);
  return prisma.$transaction(async (tx) => {
    // Bajo el cerrojo del negocio: dos altas a la vez no superan el cupo.
    const snapshot = await loadTeamSnapshot(tx, providerId);
    const max = snapshot.maxProfessionals;
    if (max !== null && snapshot.activeIds.length >= max) {
      throw new PlanProfessionalLimitError(max);
    }
    const { id } = await teamRepository.create(providerId, data, tx);
    await applyAssignment(tx, providerId, id, snapshot.services, new Set(data.serviceIds));
    return id;
  });
}

/**
 * Edita nombre, bio, foto, horario y servicios de un profesional activo.
 *
 * @throws ProfessionalNotFoundError si no existe o es de otro negocio.
 * @throws ProfessionalInactiveError si está de baja.
 * @throws ServicesWouldBeUnstaffedError si quitarle servicios deja
 *   alguno publicado sin nadie que lo preste.
 * @throws ZodError, ProfessionalPhotoInvalidError, TeamServicesInvalidError.
 */
export async function updateProfessional(
  providerId: string,
  professionalId: string,
  input: unknown,
): Promise<void> {
  const current = await teamRepository.findMember(providerId, professionalId);
  if (!current) throw new ProfessionalNotFoundError();
  if (current.deletedAt) throw new ProfessionalInactiveError();
  const data = await parseInput(providerId, input, current.photo);

  await prisma.$transaction(async (tx) => {
    const snapshot = await loadTeamSnapshot(tx, providerId);
    // Releemos dentro de la transacción, ya con el cerrojo del negocio
    // que toma el snapshot: una baja simultánea entre la lectura de
    // fuera y aquí no debe dejar editar (ni reasignar) a alguien de baja.
    const locked = await teamRepository.findMember(providerId, professionalId, tx);
    if (!locked) throw new ProfessionalNotFoundError();
    if (locked.deletedAt) throw new ProfessionalInactiveError();
    const wanted = new Set(data.serviceIds);
    const unstaffed = findNewlyUnstaffed(
      { services: published(snapshot.services), bookable: snapshot.bookable },
      {
        services: withAssignment(published(snapshot.services), professionalId, wanted),
        bookable: snapshot.bookable,
      },
    );
    if (unstaffed.length > 0) throw new ServicesWouldBeUnstaffedError(unstaffed);

    await teamRepository.update(professionalId, data, tx);
    await applyAssignment(tx, providerId, professionalId, snapshot.services, wanted);
  });
}
