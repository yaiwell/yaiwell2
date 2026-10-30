/**
 * Tipos del listado de reservas accionables del panel.
 *
 * Los tipos compartidos del dominio viven en `/types/domain.ts`; aquí
 * solo el view-model que la página servidora entrega al componente.
 */

/** Locales soportados por el panel (mismo union que el resto de features). */
export type SupportedLocale = 'es' | 'ca' | 'en' | 'de';

/**
 * Estado de la reserva SIN colapsar.
 *
 * A diferencia de `PanelBookingStatus` (el calendario funde `refunded`
 * en `cancelled` porque visualmente no aporta), aquí distinguimos los
 * estados: tras cancelar, saber si el reembolso ya salió es justo la
 * información que el proveedor busca en esta lista. `no_show` (migración
 * 9f): el cliente no se presentó.
 */
export type PanelBookingActionStatus =
  | 'pending'
  | 'confirmed'
  | 'completed'
  | 'cancelled'
  | 'refunded'
  | 'no_show';

/** Cómo paga el cliente: online o en el local (migración 9f). */
export type PanelBookingPaymentMode = 'online' | 'onsite';

/**
 * Reserva de la semana tal y como la consume el listado de acciones.
 *
 * Lleva `startAtIso` (instante real en UTC) y no solo `HH:mm`, porque
 * la regla de los 2 h de §4.bis necesita el instante absoluto para
 * recalcularse en el cliente mientras la pestaña sigue abierta.
 */
export interface PanelBookingAction {
  id: string;
  /**
   * Inicio en ISO-8601 UTC. Es `null` en modo preview: los fixtures
   * de ejemplo solo tienen `HH:mm` y día de la semana, no una fecha
   * real, y fabricar una sería mentir sobre datos que no existen.
   */
  startAtIso: string | null;
  /** Día de la semana en hora de Madrid (0 = lunes … 6 = domingo). */
  weekday: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  /** Hora de inicio en formato 24 h (`HH:mm`), hora de Madrid. */
  startTime: string;
  /** Hora de fin en formato 24 h (`HH:mm`), hora de Madrid. */
  endTime: string;
  clientName: string;
  serviceName: string;
  professionalName: string | null;
  status: PanelBookingActionStatus;
  priceCents: number;
  /**
   * Reserva cancelada (por el centro o por el cliente) cuya hora aún se
   * puede liberar con descuento. Lo decide el servidor; ausente en los
   * datos de ejemplo del modo preview.
   */
  releasable?: boolean;
  /**
   * Online o en el local. Ausente en los datos de ejemplo del modo
   * preview, que se tratan como online.
   */
  paymentMode?: PanelBookingPaymentMode;
  /**
   * Cuándo se marcó «no presentado» (ISO-8601 UTC), para ofrecer
   * «Deshacer» durante 24 h. `null` si no lo está; ausente en preview.
   */
  noShowAtIso?: string | null;
}

/** Props del componente BookingActionsList. */
export interface BookingActionsListProps {
  bookings: PanelBookingAction[];
  locale: SupportedLocale;
  /**
   * En modo preview (datos de ejemplo) la lista se sigue mostrando
   * —es su razón de ser: enseñar cómo se verá el panel con tracción—
   * pero las acciones van deshabilitadas con un aviso explícito.
   */
  readOnly: boolean;
  /**
   * Momento de referencia para evaluar la ventana de 2 h. Inyectable
   * para tests deterministas; en producción se omite y se usa `now`.
   */
  now?: Date;
}
