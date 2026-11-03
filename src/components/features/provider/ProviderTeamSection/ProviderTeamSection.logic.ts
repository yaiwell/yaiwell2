import type { PublicProfessional } from '@/types/domain';

/**
 * Decide si la ficha enseña la sección «El equipo».
 *
 * Un autónomo sin foto ni bio no aporta nada que la cabecera no diga ya
 * (su nombre suele ser el del negocio): la sección solo aparece con más
 * de un profesional o cuando alguno tiene foto o bio que enseñar.
 *
 * @param team — equipo público del centro.
 */
export function shouldShowTeam(team: readonly PublicProfessional[]): boolean {
  if (team.length > 1) return true;
  return team.some((member) => member.photo !== null || member.bio !== null);
}
