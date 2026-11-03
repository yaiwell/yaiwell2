/**
 * Huecos liberados y huecos libres de ejemplo para el modo preview del
 * calendario del panel. Sin fecha real (como `panel-bookings`): las
 * acciones están deshabilitadas y nada llega al servidor.
 */
import type { PanelFreeSlot } from '@/components/features/provider-panel/FreeSlotsSection/FreeSlotsSection.types';
import type { PanelSlotOffer } from '@/components/features/provider-panel/WeeklyCalendar/WeeklyCalendar.types';

import { FAKE_PANEL_PRO_MARINA, FAKE_PANEL_PRO_POL } from './panel-team';

/**
 * Un hueco liberado de Marina el jueves por la tarde, con un 20 %
 * vigente; coincide con una cita de Pol (carriles en «Todos»).
 */
export const fakePanelSlotOffers: PanelSlotOffer[] = [
  {
    id: 'offer-preview-1',
    startAtIso: null,
    weekday: 3,
    startTime: '18:00',
    endTime: '18:45',
    serviceName: 'Corte mujer',
    professionalId: FAKE_PANEL_PRO_MARINA,
    professionalName: 'Marina',
    discounts: { over2h: 10, oneToTwoHours: 20, underOneHour: 30 },
    currentDiscountPct: 20,
    priceCents: 5500,
    currentPriceCents: 4400,
  },
];

/**
 * Huecos libres de ejemplo. El `startAtIso` es simbólico: en preview el
 * botón está deshabilitado y nunca se envía.
 */
export const fakePanelFreeSlots: PanelFreeSlot[] = [
  {
    serviceId: 'svc-preview-1',
    serviceName: 'Corte y peinado',
    professionalId: FAKE_PANEL_PRO_MARINA,
    professionalName: 'Marina',
    startAtIso: '1970-01-01T00:00:00.000Z',
    startTime: '17:30',
    endTime: '18:15',
  },
  {
    serviceId: 'svc-preview-1',
    serviceName: 'Corte y peinado',
    professionalId: FAKE_PANEL_PRO_POL,
    professionalName: 'Pol',
    startAtIso: '1970-01-01T00:00:00.000Z',
    startTime: '17:30',
    endTime: '18:15',
  },
];
