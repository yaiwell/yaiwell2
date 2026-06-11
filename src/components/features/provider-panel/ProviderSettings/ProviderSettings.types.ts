import type { LocalizedText } from '@/types/domain';

/** Locales soportados en la UI del panel. */
export type SupportedLocale = 'es' | 'ca' | 'en' | 'de';

/**
 * Subset del modelo `Provider` de BD que necesita el formulario de
 * configuración del centro. Mantener este tipo aquí (y no en
 * `/types/domain.ts`) evita acoplar la UI a la forma del dominio de
 * fake-data — esta forma sigue la convención `businessName`, descripción
 * JSON, vatNumber nullable, etc., que es lo que devuelve Prisma.
 */
export interface SettingsProvider {
  businessName: string;
  /** NIF/CIF — opcional, los autónomos pueden no tener uno asignado al alta. */
  vatNumber: string | null;
  /** `{ es, ca, en?, de? }`. */
  description: LocalizedText;
  /** Dirección postal completa (formato libre, viene de Mapbox). */
  address: string;
  /** URLs absolutas. La primera es la portada. Vacío al alta. */
  photos: string[];
}

/** Props del componente de configuración del centro. */
export interface ProviderSettingsProps {
  provider: SettingsProvider;
  locale: SupportedLocale;
}
