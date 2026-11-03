import 'server-only';

import { weeklyScheduleSchema } from '@/lib/services/availability/availability.validation';
import type { WeeklySchedule } from '@/lib/services/availability/availability.types';
import type { LocalizedText } from '@/types/domain';

import { selectBookableIds } from './team.bookable';
import { teamRepository } from './team.repository';
import { findUnstaffed, memberStatus } from './team.rules';
import type {
  BlockingBooking,
  ProfessionalDetail,
  TeamMember,
  TeamOverview,
  TeamServiceOption,
} from './team.types';

/** Horario cerrado los 7 días: base de un profesional nuevo o corrupto. */
export const EMPTY_WEEKLY_SCHEDULE: WeeklySchedule = {
  monday: [],
  tuesday: [],
  wednesday: [],
  thursday: [],
  friday: [],
  saturday: [],
  sunday: [],
};

/** Activos por antigüedad y el corte del plan, a partir del listado. */
function bookableFrom(
  members: readonly { id: string; deletedAt: Date | null }[],
  max: number | null,
): Set<string> {
  const activeIds = members.filter((m) => m.deletedAt === null).map((m) => m.id);
  return new Set(selectBookableIds(activeIds, max));
}

/**
 * Equipo del negocio para `/panel/equipo`: miembros con su estado,
 * contador del plan y servicios publicados que nadie puede atender.
 *
 * @param providerId — negocio de la sesión (`requireCurrentProvider`).
 */
export async function getTeamOverview(providerId: string): Promise<TeamOverview> {
  const [members, max, services] = await Promise.all([
    teamRepository.findMembers(providerId),
    teamRepository.findMaxProfessionals(providerId),
    teamRepository.findServicesWithStaff(providerId),
  ]);
  const maxProfessionals = max ?? null;
  const bookable = bookableFrom(members, maxProfessionals);
  const rows: TeamMember[] = members.map((m) => ({
    id: m.id,
    name: m.name,
    photo: m.photo,
    status: memberStatus(m.id, m.deletedAt === null, bookable),
    serviceCount: m._count.serviceLinks,
  }));
  const publishedStaff = services
    .filter((s) => s.isActive)
    .map((s) => ({
      id: s.id,
      name: s.name as unknown as LocalizedText,
      professionalIds: s.professionals.map((link) => link.professionalId),
    }));
  return {
    members: rows,
    // Cuenta solo los que entran en el cupo: con 4 activos en Gratis el
    // contador decía «4 de 3»; los que sobran ya llevan su aviso aparte.
    activeCount: members.filter((m) => m.deletedAt === null && bookable.has(m.id)).length,
    maxProfessionals,
    unstaffedServices: findUnstaffed(publishedStaff, bookable),
  };
}

/**
 * Ficha de un profesional para editarla.
 *
 * @returns `null` si no existe o es de otro negocio (la página da 404).
 */
export async function getProfessionalDetail(
  providerId: string,
  professionalId: string,
): Promise<ProfessionalDetail | null> {
  const [member, members, max] = await Promise.all([
    teamRepository.findMember(providerId, professionalId),
    teamRepository.findMembers(providerId),
    teamRepository.findMaxProfessionals(providerId),
  ]);
  if (!member) return null;
  const parsed = weeklyScheduleSchema.safeParse(member.schedule);
  const bookable = bookableFrom(members, max ?? null);
  return {
    id: member.id,
    name: member.name,
    photo: member.photo,
    bio: member.bio,
    // Un JSON antiguo que no encaja se edita desde cero en vez de romper.
    schedule: parsed.success ? parsed.data : EMPTY_WEEKLY_SCHEDULE,
    serviceIds: member.serviceLinks.map((link) => link.serviceId),
    status: memberStatus(member.id, member.deletedAt === null, bookable),
  };
}

/** Servicios del negocio para las casillas «Servicios que presta». */
export async function listTeamServiceOptions(providerId: string): Promise<TeamServiceOption[]> {
  const rows = await teamRepository.findServiceOptions(providerId);
  return rows.map((row) => ({ id: row.id, name: row.name as unknown as LocalizedText }));
}

/**
 * Profesionales activos para el selector «Quién lo presta» del
 * formulario de servicio, con la marca de fuera de plan.
 */
export async function listActiveProfessionalOptions(
  providerId: string,
): Promise<{ id: string; name: string; outOfPlan: boolean }[]> {
  const [members, max] = await Promise.all([
    teamRepository.findMembers(providerId),
    teamRepository.findMaxProfessionals(providerId),
  ]);
  const bookable = bookableFrom(members, max ?? null);
  return members
    .filter((m) => m.deletedAt === null)
    .map((m) => ({ id: m.id, name: m.name, outOfPlan: !bookable.has(m.id) }));
}

/**
 * Citas futuras activas de un profesional del negocio: las que impedirían
 * darlo de baja. El diálogo de baja las lista antes de intentarlo; la
 * comprobación que manda es la de `deactivateProfessional`.
 */
export async function listBlockingBookings(
  providerId: string,
  professionalId: string,
  now: Date = new Date(),
): Promise<BlockingBooking[]> {
  const member = await teamRepository.findMember(providerId, professionalId);
  if (!member || member.deletedAt) return [];
  const rows = await teamRepository.findFutureActiveBookings(professionalId, now);
  return rows.map((b) => ({
    id: b.id,
    startAt: b.startAt,
    serviceName: b.service.name as unknown as LocalizedText,
  }));
}
