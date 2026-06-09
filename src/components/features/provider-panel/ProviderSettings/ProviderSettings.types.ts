import type { Provider } from '@/types/domain';

/** Locales soportados en la UI del panel. */
export type SupportedLocale = 'es' | 'ca' | 'en' | 'de';

/** Props del componente de configuración del centro. */
export interface ProviderSettingsProps {
  provider: Provider;
  locale: SupportedLocale;
}
