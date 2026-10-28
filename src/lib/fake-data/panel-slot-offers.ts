/**
 * Huecos liberados y huecos libres de ejemplo para el modo preview del
 * calendario del panel. Sin fecha real (como `panel-bookings`): las
 * acciones están deshabilitadas y nada llega al servidor.
 */
import type { PanelFreeSlot } from '@/components/features/provider-panel/FreeSlotsSection/FreeSlotsSection.types';
import type { PanelSlotOffer } from '@/components/features/provider-panel/WeeklyCalendar/WeeklyCalendar.types';

/** Un hueco liberado el jueves por la tarde, con un 20 % vigente. */
export const fakePanelSlotOffers: PanelSlotOffer[] = [
  {
    id: 'offer-preview-1',
    startAtIso: null,
    weekday: 3,
    startTime: '18:00',
    endTime: '18:45',
    serviceName: 'Manicura semipermanente',
    professionalName: 'Lucía',
    discounts: { over2h: 10, oneToTwoHours: 20, underOneHour: 30 },
    currentDiscountPct: 20,
    priceCents: 3200,
    currentPriceCents: 2560,
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
    startAtIso: '1970-01-01T00:00:00.000Z',
    startTime: '17:30',
    endTime: '18:15',
  },
];
