/**
 * Bloqueos de agenda de ejemplo para el modo preview del calendario del
 * panel. Sin fecha real (como `panel-bookings`): «Quitar bloqueo» está
 * deshabilitado y nada llega al servidor.
 */
import type { PanelScheduleBlock } from '@/components/features/provider-panel/WeeklyCalendar/WeeklyCalendar.types';

import { FAKE_PANEL_PRO_MARINA, FAKE_PANEL_PRO_POL } from './panel-team';

/**
 * Un rato de Pol el miércoles por la tarde y el domingo entero de
 * Marina (días sin citas suyas a esas horas).
 */
export const fakePanelScheduleBlocks: PanelScheduleBlock[] = [
  {
    id: 'block-preview-1',
    segmentKey: 'block-preview-1:wed',
    weekday: 2,
    startTime: '15:00',
    endTime: '17:00',
    reason: 'Formación de producto',
    professionalId: FAKE_PANEL_PRO_POL,
    professionalName: 'Pol',
    startAtIso: null,
    endAtIso: null,
    isFullDay: false,
  },
  {
    id: 'block-preview-2',
    segmentKey: 'block-preview-2:sun',
    weekday: 6,
    startTime: '00:00',
    endTime: '24:00',
    reason: null,
    professionalId: FAKE_PANEL_PRO_MARINA,
    professionalName: 'Marina',
    startAtIso: null,
    endAtIso: null,
    isFullDay: true,
  },
];
