import type { AdminVerificationRequest } from '@/lib/fake-data/admin-verifications';

export interface VerificationDetailProps {
  request: AdminVerificationRequest;
}

/**
 * Resultado de la acción mock del moderador. Lo usamos para mostrar
 * el toast embebido en la UI (sin librería externa) sin recurrir a
 * `alert()` ni `console.warn` (prohibidos por las reglas del proyecto).
 */
export type ModerationOutcome = 'approved' | 'rejected' | null;
