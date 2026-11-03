/**
 * Filtro por profesional del calendario del panel (`?pro=<id>`).
 *
 * Archivo sin dependencias de servidor: lo usan los services del panel
 * con datos reales y la página con los datos de ejemplo del modo preview.
 */
import type { PanelTeamMember } from '@/components/features/provider-panel/WeeklyCalendar/WeeklyCalendar.types';

/**
 * Profesional que pide la URL, solo si es del equipo activo del negocio.
 *
 * Un id ajeno, de baja o inventado se ignora (se ve todo el equipo): el
 * filtro es comodidad de vista, nunca un permiso, y los services siguen
 * filtrando por el `providerId` de la sesión.
 *
 * @param raw — valor crudo de `?pro=`.
 * @param team — profesionales activos del negocio.
 * @returns el id elegido o `null` (todos).
 */
export function resolveProfessionalFilter(
  raw: string | string[] | undefined,
  team: readonly PanelTeamMember[],
): string | null {
  if (typeof raw !== 'string' || team.length < 2) return null;
  return team.some((member) => member.id === raw) ? raw : null;
}

/**
 * Deja solo lo del profesional elegido. Con `null` (todos) devuelve la
 * lista tal cual.
 */
export function filterByProfessional<T extends { professionalId?: string | null }>(
  items: T[],
  professionalId: string | null | undefined,
): T[] {
  if (!professionalId) return items;
  return items.filter((item) => item.professionalId === professionalId);
}
