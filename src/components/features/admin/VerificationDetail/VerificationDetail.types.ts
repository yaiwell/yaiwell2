import type { AppLocale } from '@/i18n/routing';
import type { AdminVerificationRequest } from '@/lib/services/verification';

export interface VerificationDetailProps {
  request: AdminVerificationRequest;
  locale: AppLocale;
}

/**
 * Códigos de error que la action puede devolver, mapeados a copy i18n
 * en `adminArea.verifications.detail.errors.*`. `null` cuando aún no
 * ha habido decisión o cuando la última fue exitosa.
 */
export type ModerationError =
  | 'PROVIDER_NOT_FOUND'
  | 'VALIDATION'
  | 'NOTES_REQUIRED'
  | 'FORBIDDEN'
  | 'INTERNAL'
  | null;
