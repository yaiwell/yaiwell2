import type { Provider, Service } from '@/types/domain';

/**
 * Locales soportados en la ficha de servicio.
 * Coinciden con los locales configurados en `src/i18n/routing.ts`.
 */
export type SupportedLocale = 'es' | 'ca';

/**
 * Mock ligero de profesional asignado a un servicio.
 *
 * Definido localmente porque el catálogo de fake-data aún no maneja
 * profesionales reales (`service.professionalId` es siempre `null` en
 * Fase 0). Cuando llegue el tipo `Professional` al dominio compartido
 * en `/types/domain.ts`, este alias podrá retirarse sustituyéndolo por
 * el de dominio sin tocar la UI.
 */
export interface AssignedProfessional {
  id: string;
  name: string;
  photoUrl: string;
  role: string;
}

/**
 * Props del componente `ServiceDetail`.
 *
 * Recibe el proveedor y el servicio ya cargados desde el service layer,
 * más un `professional` opcional para mostrar nombre + foto. Si llega
 * `null`, la UI muestra el fallback "cualquier profesional disponible".
 *
 * `reserveHref` se inyecta desde la página para desacoplar la ficha de
 * la construcción de la URL de reserva (que vive en otra ruta y la
 * implementa otro agente).
 */
export interface ServiceDetailProps {
  provider: Provider;
  service: Service;
  professional: AssignedProfessional | null;
  locale: SupportedLocale;
  /** URL absoluta o relativa a la que apunta el CTA "Reservar". */
  reserveHref: string;
  /** Segmento `{slug}-{id}` usado en breadcrumbs hacia la ficha del centro. */
  providerSlugWithId: string;
}
