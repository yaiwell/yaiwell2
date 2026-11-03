import type { PanelTeamMember } from './ScheduleBlockDialog.types';

/** Valor del selector para «Todo el equipo» (los ids reales son uuid). */
export const ALL_TEAM = 'all';

/**
 * A quién se bloquea al abrir: con un solo profesional, el suyo (el
 * selector ni se enseña); con equipo, el del filtro del calendario si
 * sigue en el equipo, o nadie (hay que elegir: bloquear a todos por
 * defecto sería demasiado fácil de hacer sin querer).
 */
export function getInitialTarget(
  team: readonly PanelTeamMember[],
  defaultProfessionalId: string | null,
): string {
  if (team.length === 1) return team[0].id;
  if (defaultProfessionalId && team.some((m) => m.id === defaultProfessionalId)) {
    return defaultProfessionalId;
  }
  return '';
}
