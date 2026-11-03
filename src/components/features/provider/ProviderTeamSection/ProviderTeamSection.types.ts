import type { PublicProfessional } from '@/types/domain';

/**
 * Tipos de la sección «El equipo» de la ficha del centro.
 */
export interface ProviderTeamSectionProps {
  /** Equipo público ya resuelto en servidor (`ProviderDetail.team`). */
  team: PublicProfessional[];
}
