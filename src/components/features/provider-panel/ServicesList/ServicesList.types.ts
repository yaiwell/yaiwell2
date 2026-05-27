import type { PanelService } from '@/lib/fake-data/panel-services';

/** Locales soportados en la UI del panel. */
export type SupportedLocale = 'es' | 'ca';

/** Props del listado de servicios del panel. */
export interface ServicesListProps {
  services: PanelService[];
  locale: SupportedLocale;
}
