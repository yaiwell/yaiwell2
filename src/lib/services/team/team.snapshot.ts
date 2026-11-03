/**
 * Foto del equipo de un negocio dentro de una transacción: quién está
 * activo, quién entra en el cupo del plan y quién presta cada servicio.
 * La comparten el alta, la edición y la baja para aplicar las mismas
 * reglas sobre el mismo estado.
 */
import type { Prisma } from '@prisma/client';

import {
  serviceTeamRepository,
  syncServiceProfessionals,
} from '@/lib/services/provider-onboarding';
import type { LocalizedText } from '@/types/domain';

import { selectBookableIds } from './team.bookable';
import { TeamProviderNotFoundError } from './team.errors';
import { teamRepository } from './team.repository';
import type { ServiceStaff } from './team.rules';

type Tx = Prisma.TransactionClient;

/** Servicio vivo con su personal activo y si está publicado. */
export interface LiveServiceStaff extends ServiceStaff {
  isActive: boolean;
}

export interface TeamSnapshot {
  /** `Plan.maxProfessionals`; `null` = sin límite. */
  maxProfessionals: number | null;
  /** Activos por antigüedad. */
  activeIds: string[];
  bookable: Set<string>;
  services: LiveServiceStaff[];
}

/**
 * Bloquea el negocio (cupo del plan) y lee el equipo y sus servicios.
 *
 * @throws TeamProviderNotFoundError si el negocio no existe.
 */
export async function loadTeamSnapshot(tx: Tx, providerId: string): Promise<TeamSnapshot> {
  const maxProfessionals = await teamRepository.lockProviderPlan(providerId, tx);
  if (maxProfessionals === undefined) throw new TeamProviderNotFoundError();
  const [activeIds, services] = await Promise.all([
    serviceTeamRepository.findActiveProfessionalIds(providerId, tx),
    teamRepository.findServicesWithStaff(providerId, tx),
  ]);
  return {
    maxProfessionals,
    activeIds,
    bookable: new Set(selectBookableIds(activeIds, maxProfessionals)),
    services: services.map((s) => ({
      id: s.id,
      name: s.name as unknown as LocalizedText,
      isActive: s.isActive,
      professionalIds: s.professionals.map((link) => link.professionalId),
    })),
  };
}

/** Solo los servicios publicados (los que importan para «sin nadie»). */
export function published(services: readonly LiveServiceStaff[]): LiveServiceStaff[] {
  return services.filter((s) => s.isActive);
}

/**
 * Escribe la asignación de un profesional: lo añade a los servicios de
 * `serviceIds` y lo quita del resto, tocando solo los que cambian.
 *
 * Pasa por `syncServiceProfessionals` (la misma puerta que el
 * formulario de servicio). Un servicio PAUSADO puede quedarse sin nadie
 * (no se reserva); para ese caso se vacía la asignación directamente,
 * porque el sync exige al menos un profesional.
 */
export async function applyAssignment(
  tx: Tx,
  providerId: string,
  professionalId: string,
  services: readonly LiveServiceStaff[],
  serviceIds: ReadonlySet<string>,
): Promise<void> {
  for (const service of services) {
    const has = service.professionalIds.includes(professionalId);
    const wants = serviceIds.has(service.id);
    if (has === wants) continue;
    const others = service.professionalIds.filter((id) => id !== professionalId);
    const next = wants ? [...others, professionalId] : others;
    if (next.length === 0) {
      await serviceTeamRepository.replaceServiceProfessionals(service.id, [], tx);
    } else {
      await syncServiceProfessionals(service.id, providerId, next, tx);
    }
  }
}
