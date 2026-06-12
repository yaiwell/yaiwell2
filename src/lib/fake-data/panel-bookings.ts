/**
 * Reservas ficticias de la semana actual para el panel del proveedor.
 *
 * El calendario real (`/panel/calendario`) ya consulta BD desde
 * 2026-06-12. Este módulo se mantiene como fixture de tests; los
 * tipos viven junto al componente que los consume.
 */

import {
  PANEL_CALENDAR_END_HOUR,
  PANEL_CALENDAR_START_HOUR,
  type PanelBooking,
  type PanelBookingStatus,
} from '@/components/features/provider-panel/WeeklyCalendar/WeeklyCalendar.types';

// Re-export para no romper imports antiguos.
export type { PanelBooking, PanelBookingStatus };
export { PANEL_CALENDAR_START_HOUR, PANEL_CALENDAR_END_HOUR };

/**
 * 20 reservas distribuidas por la semana del proveedor activo.
 *
 * Mezcla de servicios de la peluquería `Atelier Norte` (prov-01) para
 * dar verosimilitud. Algunas en estado `pending` o `cancelled` para que
 * la UI pueda mostrar los distintos badges visuales.
 */
export const fakePanelBookings: PanelBooking[] = [
  // Lunes
  {
    id: 'bk-101',
    weekday: 0,
    startTime: '09:00',
    endTime: '10:00',
    clientName: 'Marta R.',
    serviceName: 'Corte mujer',
    professionalName: 'Marina',
    status: 'completed',
    priceCents: 5500,
  },
  {
    id: 'bk-102',
    weekday: 0,
    startTime: '11:30',
    endTime: '12:15',
    clientName: 'Joan M.',
    serviceName: 'Corte hombre',
    professionalName: 'Pol',
    status: 'completed',
    priceCents: 3800,
  },
  {
    id: 'bk-103',
    weekday: 0,
    startTime: '16:00',
    endTime: '18:00',
    clientName: 'Núria P.',
    serviceName: 'Color completo',
    professionalName: 'Marina',
    status: 'confirmed',
    priceCents: 9500,
  },

  // Martes
  {
    id: 'bk-104',
    weekday: 1,
    startTime: '10:00',
    endTime: '11:00',
    clientName: 'Laia B.',
    serviceName: 'Corte mujer',
    professionalName: 'Pol',
    status: 'confirmed',
    priceCents: 5500,
  },
  {
    id: 'bk-105',
    weekday: 1,
    startTime: '13:00',
    endTime: '14:15',
    clientName: 'Carmen S.',
    serviceName: 'Peinado evento',
    professionalName: 'Marina',
    status: 'confirmed',
    priceCents: 6500,
  },
  {
    id: 'bk-106',
    weekday: 1,
    startTime: '17:30',
    endTime: '18:30',
    clientName: 'Pol G.',
    serviceName: 'Corte mujer',
    professionalName: 'Pol',
    status: 'pending',
    priceCents: 5500,
  },

  // Miércoles
  {
    id: 'bk-107',
    weekday: 2,
    startTime: '09:30',
    endTime: '10:30',
    clientName: 'Aitor F.',
    serviceName: 'Corte hombre',
    professionalName: 'Pol',
    status: 'confirmed',
    priceCents: 3800,
  },
  {
    id: 'bk-108',
    weekday: 2,
    startTime: '12:00',
    endTime: '14:00',
    clientName: 'Helena V.',
    serviceName: 'Color completo',
    professionalName: 'Marina',
    status: 'confirmed',
    priceCents: 9500,
  },
  {
    id: 'bk-109',
    weekday: 2,
    startTime: '18:00',
    endTime: '19:00',
    clientName: 'Berta A.',
    serviceName: 'Corte mujer',
    professionalName: 'Marina',
    status: 'cancelled',
    priceCents: 5500,
  },

  // Jueves
  {
    id: 'bk-110',
    weekday: 3,
    startTime: '10:00',
    endTime: '11:00',
    clientName: 'Marc D.',
    serviceName: 'Corte hombre',
    professionalName: 'Pol',
    status: 'completed',
    priceCents: 3800,
  },
  {
    id: 'bk-111',
    weekday: 3,
    startTime: '11:30',
    endTime: '12:30',
    clientName: 'Anna G.',
    serviceName: 'Corte mujer',
    professionalName: 'Marina',
    status: 'confirmed',
    priceCents: 5500,
  },
  {
    id: 'bk-112',
    weekday: 3,
    startTime: '16:00',
    endTime: '18:00',
    clientName: 'Roger P.',
    serviceName: 'Color completo',
    professionalName: 'Marina',
    status: 'confirmed',
    priceCents: 9500,
  },
  {
    id: 'bk-113',
    weekday: 3,
    startTime: '18:30',
    endTime: '19:45',
    clientName: 'Ona C.',
    serviceName: 'Peinado evento',
    professionalName: 'Pol',
    status: 'confirmed',
    priceCents: 6500,
  },

  // Viernes
  {
    id: 'bk-114',
    weekday: 4,
    startTime: '09:00',
    endTime: '10:00',
    clientName: 'Xavi T.',
    serviceName: 'Corte hombre',
    professionalName: 'Pol',
    status: 'confirmed',
    priceCents: 3800,
  },
  {
    id: 'bk-115',
    weekday: 4,
    startTime: '11:00',
    endTime: '12:00',
    clientName: 'Eulàlia O.',
    serviceName: 'Corte mujer',
    professionalName: 'Marina',
    status: 'confirmed',
    priceCents: 5500,
  },
  {
    id: 'bk-116',
    weekday: 4,
    startTime: '13:00',
    endTime: '14:15',
    clientName: 'Núria S.',
    serviceName: 'Peinado evento',
    professionalName: 'Marina',
    status: 'confirmed',
    priceCents: 6500,
  },
  {
    id: 'bk-117',
    weekday: 4,
    startTime: '17:00',
    endTime: '19:00',
    clientName: 'Sergi R.',
    serviceName: 'Color completo',
    professionalName: 'Marina',
    status: 'pending',
    priceCents: 9500,
  },

  // Sábado
  {
    id: 'bk-118',
    weekday: 5,
    startTime: '10:00',
    endTime: '11:00',
    clientName: 'Clàudia M.',
    serviceName: 'Corte mujer',
    professionalName: 'Marina',
    status: 'confirmed',
    priceCents: 5500,
  },
  {
    id: 'bk-119',
    weekday: 5,
    startTime: '11:30',
    endTime: '12:15',
    clientName: 'Roberto N.',
    serviceName: 'Corte hombre',
    professionalName: 'Pol',
    status: 'confirmed',
    priceCents: 3800,
  },
  {
    id: 'bk-120',
    weekday: 5,
    startTime: '13:00',
    endTime: '14:00',
    clientName: 'Carla N.',
    serviceName: 'Corte mujer',
    professionalName: 'Marina',
    status: 'confirmed',
    priceCents: 5500,
  },
];
