import type { PublicProfessional } from '@/types/domain';

/**
 * Lógica pura del selector de profesional (CLAUDE.md §4.bis «Equipo»).
 * Sin React para poder probarla aislada y reutilizarla en el flujo.
 */

/**
 * El selector solo tiene sentido con más de un profesional: con uno, «Cualquiera»
 * y él son la misma agenda, y preguntar sería ruido.
 *
 * @param professionals — quienes prestan el servicio.
 */
export function shouldShowProfessionalPicker(
  professionals: readonly PublicProfessional[],
): boolean {
  return professionals.length > 1;
}

/**
 * Busca un profesional de la lista por id, o `null` si no está.
 *
 * @param professionalId — id buscado; `null` devuelve `null`.
 * @param professionals — lista en la que buscar.
 */
export function findProfessional(
  professionalId: string | null | undefined,
  professionals: readonly PublicProfessional[],
): PublicProfessional | null {
  if (!professionalId) return null;
  return professionals.find((professional) => professional.id === professionalId) ?? null;
}
