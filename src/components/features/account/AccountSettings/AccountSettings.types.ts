import type { AppLocale } from '@/i18n/routing';

/**
 * Tipos de las tarjetas de `/cuenta/ajustes`.
 */
export interface AccountPreferencesCardProps {
  /** Idioma guardado para los correos de la cuenta. */
  emailLocale: AppLocale;
}
