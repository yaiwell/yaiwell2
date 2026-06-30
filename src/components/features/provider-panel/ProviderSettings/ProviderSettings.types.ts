import type { WeeklySchedule } from '@/lib/services/availability';
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
  /** ID interno; se usa como `ownerId` del bucket de fotos. */
  id: string;
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
  /** Horario semanal actual (del primer Professional del provider). */
  schedule: WeeklySchedule;
  locale: SupportedLocale;
}

/**
 * Draft local del formulario. `description` ya es el texto pickeado en
 * el locale activo (string plano), no el `LocalizedText` completo — la
 * action lo envuelve antes de mandarlo al backend.
 */
export interface ProviderSettingsDraft {
  businessName: string;
  vatNumber: string;
  description: string;
  address: string;
}

/**
 * Códigos de error agregados que la UI muestra tras intentar guardar.
 *
 * Combina los códigos posibles de `updateProviderSettingsAction` y
 * `updateProviderScheduleAction`. El form los lanza en paralelo y la
 * UI muestra el primer error que encuentre; añadir `NO_PROFESSIONAL`
 * permite copy específico ("contacta soporte") para el caso patológico
 * de un provider sin Professional asociado.
 */
export type SaveErrorCode = 'PROVIDER_NOT_FOUND' | 'VALIDATION' | 'NO_PROFESSIONAL' | 'INTERNAL';

/** Notice mostrado al usuario tras intentar guardar. */
export type SaveNotice = { kind: 'success' } | { kind: 'error'; code: SaveErrorCode };
