import type { Provider, PublicProfessional, Service } from '@/types/domain';

/**
 * Locales soportados en la ficha de servicio.
 * Coinciden con los locales configurados en `src/i18n/routing.ts`.
 */
export type SupportedLocale = 'es' | 'ca' | 'en' | 'de';

/**
 * Props del componente `ServiceDetail`.
 *
 * Recibe el proveedor, el servicio y quién lo presta ya cargados desde
 * el service layer (`getProviderService`, tabla `service_professionals`).
 * Con la lista vacía la UI muestra el fallback "cualquier profesional
 * disponible".
 *
 * `reserveHref` se inyecta desde la página para desacoplar la ficha de
 * la construcción de la URL de reserva (que vive en otra ruta y la
 * implementa otro agente).
 */
export interface ServiceDetailProps {
  provider: Provider;
  service: Service;
  /** Profesionales activos que prestan el servicio, por antigüedad. */
  professionals: PublicProfessional[];
  locale: SupportedLocale;
  /** URL absoluta o relativa a la que apunta el CTA "Reservar". */
  reserveHref: string;
  /** Segmento `{slug}-{id}` usado en breadcrumbs hacia la ficha del centro. */
  providerSlugWithId: string;
}

/** Props del bloque «Quién lo presta». */
export interface ServiceProfessionalsProps {
  professionals: PublicProfessional[];
  /** Nombre del negocio: su inicial ilustra el caso sin profesionales. */
  providerName: string;
}
