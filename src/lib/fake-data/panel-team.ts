/**
 * Equipo de ejemplo del modo preview del calendario del panel: dos
 * profesionales para que se vean el filtro «Todos / Marina / Pol» y el
 * reparto en carriles de las citas que coinciden.
 */
import type { PanelTeamMember } from '@/components/features/provider-panel/WeeklyCalendar/WeeklyCalendar.types';

export const FAKE_PANEL_PRO_MARINA = 'pro-preview-marina';
export const FAKE_PANEL_PRO_POL = 'pro-preview-pol';

export const fakePanelTeam: PanelTeamMember[] = [
  { id: FAKE_PANEL_PRO_MARINA, name: 'Marina' },
  { id: FAKE_PANEL_PRO_POL, name: 'Pol' },
];
