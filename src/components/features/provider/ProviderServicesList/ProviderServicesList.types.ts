import type { Category, Service } from '@/types/domain';

/**
 * Tipos específicos del componente ProviderServicesList.
 * Los tipos compartidos del dominio viven en /types/domain.ts.
 */

/** Locales soportados por la UI (alineado con next-intl). */
export type SupportedLocale = 'es' | 'ca';

/**
 * Grupo de servicios bajo una misma categoría raíz.
 * `rootCategory` puede ser `null` cuando no logramos resolver la
 * categoría a una raíz conocida; en ese caso el render muestra
 * el grupo bajo el header "Otros".
 */
export interface ServiceGroup {
  rootCategory: Category | null;
  services: Service[];
}

/** Props públicas del componente. */
export interface ProviderServicesListProps {
  services: Service[];
  /** Locale activo para resolver el texto de categorías y servicios. */
  locale: SupportedLocale;
}

/** Props del sheet de detalle de servicio. */
export interface ServiceDetailSheetProps {
  /** Servicio seleccionado; `null` cuando el sheet está cerrado. */
  service: Service | null;
  /** Estado controlado de apertura del sheet. */
  open: boolean;
  /** Callback cuando Radix solicita cambiar el estado de apertura. */
  onOpenChange: (open: boolean) => void;
  /** Locale activo para resolver textos del dominio. */
  locale: SupportedLocale;
}
