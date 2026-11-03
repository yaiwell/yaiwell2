import type { TeamMemberStatus, TeamOverview } from '@/lib/services/team';

/**
 * Cálculos puros del listado del equipo (sin hooks: el listado se pinta
 * en servidor).
 */

/** ¿Puede añadir otro profesional activo con su plan? */
export function canAddProfessional(overview: TeamOverview): boolean {
  return overview.maxProfessionals === null || overview.activeCount < overview.maxProfessionals;
}

/** ¿Hay alguien activo fuera del cupo del plan? */
export function hasOutOfPlan(overview: TeamOverview): boolean {
  return overview.members.some((m) => m.status === 'outOfPlan');
}

/** Clave i18n de la etiqueta de estado. */
export function statusKey(status: TeamMemberStatus) {
  return `status.${status}` as const;
}
