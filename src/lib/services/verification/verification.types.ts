/**
 * Tipos del dominio `verification` (cola admin).
 *
 * `AdminVerificationRequest` mantiene **la misma shape** que el mock de
 * `lib/fake-data/admin-verifications` para no obligar a tocar la UI:
 * `VerificationsQueue` y `VerificationDetail` consumen este tipo
 * directamente. Cuando aparezcan campos nuevos del wizard (phone, docs
 * subidos a Supabase Storage) los rellenamos aquí.
 *
 * `id` ahora corresponde al `Provider.id` real (UUID), no a un alias
 * `ver-NN` como en el mock de Fase 0. Las URLs públicas no cambian:
 * el segmento `[id]` ya acepta cualquier string.
 */

export type VerificationStatus = 'pending' | 'approved' | 'rejected';

export type VerificationDocumentType = 'identity' | 'business' | 'insurance' | 'portfolio';

export interface VerificationDocument {
  id: string;
  type: VerificationDocumentType;
  url: string;
  filename: string;
}

export interface AdminVerificationRequest {
  /** `Provider.id` (UUID v4). Las URLs del panel usan este valor. */
  id: string;
  status: VerificationStatus;
  submittedAt: Date;
  providerName: string;
  providerType: 'autonomo' | 'centro';
  providerCity: string;
  providerCategory: string;
  contactEmail: string;
  contactPhone: string;
  vatNumber: string;
  description: string;
  documents: VerificationDocument[];
}
