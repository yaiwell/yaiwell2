/**
 * Tipos de la sección «Huecos libres en las próximas 2 h» del panel.
 */
/** Hueco libre que el profesional puede liberar con descuento. */
export interface PanelFreeSlot {
  serviceId: string;
  serviceName: string;
  /** Inicio en ISO-8601 UTC: es lo que viaja a la action. */
  startAtIso: string;
  /** `HH:mm` en hora de Madrid. */
  startTime: string;
  endTime: string;
}

export interface FreeSlotsSectionProps {
  slots: PanelFreeSlot[];
  /** Modo preview: datos de ejemplo y botones deshabilitados. */
  readOnly: boolean;
}
