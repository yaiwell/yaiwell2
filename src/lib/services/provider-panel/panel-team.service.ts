import 'server-only';

import type { PanelTeamMember } from '@/components/features/provider-panel/WeeklyCalendar/WeeklyCalendar.types';
import { prisma } from '@/lib/db/prisma';

/**
 * Profesionales activos del negocio para el filtro del calendario y el
 * selector del diálogo «Bloquear horas».
 *
 * Por antigüedad (el mismo orden que el resto del panel): el primero
 * suele ser el propio dueño. Los de baja no salen: no tienen agenda.
 *
 * @param providerId — Provider del usuario autenticado.
 */
export async function getPanelActiveTeam(providerId: string): Promise<PanelTeamMember[]> {
  return prisma.professional.findMany({
    where: { providerId, deletedAt: null },
    select: { id: true, name: true },
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
  });
}
