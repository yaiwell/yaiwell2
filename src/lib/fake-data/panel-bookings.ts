/**
 * Reservas ficticias de la semana actual para el panel del proveedor.
 *
 * Las fechas se calculan relativas a un anchor fijo (`REFERENCE_MONDAY`)
 * para que la demo sea determinista entre renders y entre máquinas.
 * En producción vendrán de `Booking.findMany` filtrado por providerId
 * y rango `startAt` semanal.
 */

/** Estado de una reserva, alineado con `BookingStatus` del dominio. */
export type PanelBookingStatus = 'confirmed' | 'pending' | 'completed' | 'cancelled';

/**
 * Reserva tal y como se pinta en el calendario semanal del panel.
 *
 * El profesional es opcional porque para autónomos no aplica
 * desambiguar (siempre es la misma persona).
 */
export interface PanelBooking {
  id: string;
  /** Día de la semana en que cae (0 = lunes, 6 = domingo). */
  weekday: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  /** Hora de inicio en formato 24h (`HH:mm`). */
  startTime: string;
  /** Hora de fin en formato 24h (`HH:mm`). */
  endTime: string;
  clientName: string;
  serviceName: string;
  professionalName: string | null;
  status: PanelBookingStatus;
  priceCents: number;
}

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

/**
 * Rango horario que pinta el calendario semanal del panel.
 *
 * Fijamos un rango razonable (08:00 a 21:00) que cubre la mayoría de
 * horarios comerciales sin sobrecargar la cuadrícula. La hora de inicio
 * y fin se exportan como constantes para reutilizar tanto en el render
 * de la cuadrícula como en cálculos de posicionamiento.
 */
export const PANEL_CALENDAR_START_HOUR = 8;
export const PANEL_CALENDAR_END_HOUR = 21;
