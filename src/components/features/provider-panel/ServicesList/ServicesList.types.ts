import type { LocalizedText } from '@/types/domain';

/** Locales soportados en la UI del panel. */
export type SupportedLocale = 'es' | 'ca' | 'en' | 'de';

/**
 * Estado visible del servicio en el panel: publicado o pausado.
 *
 * Por ahora todos los servicios reales llegan como `'active'` porque la
 * BD aún no tiene columna de pausa. Cuando exista (Service.isActive o
 * similar), la página servidora la mapeará aquí.
 */
export type PanelServiceStatus = 'active' | 'paused';

/**
 * Servicio tal como se muestra en el listado del panel del proveedor.
 *
 * View-model plano sin relaciones expandidas — la página servidora
 * resuelve los joins (categoría, conteos) y entrega solo lo necesario
 * para renderizar.
 */
export interface PanelService {
  id: string;
  name: LocalizedText;
  description: LocalizedText;
  /** Categoría raíz ya traducida para chips visuales. */
  categoryLabel: LocalizedText;
  durationMinutes: number;
  priceCents: number;
  status: PanelServiceStatus;
  /** Número de reservas en los últimos 30 días. */
  bookingsLast30Days: number;
}

/** Props del listado de servicios del panel. */
export interface ServicesListProps {
  services: PanelService[];
  locale: SupportedLocale;
}
