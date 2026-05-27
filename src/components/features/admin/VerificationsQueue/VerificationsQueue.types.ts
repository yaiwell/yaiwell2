import type { AdminVerificationRequest } from '@/lib/fake-data/admin-verifications';

export interface VerificationsQueueProps {
  /** Solicitudes pendientes ordenadas (las más recientes primero). */
  requests: AdminVerificationRequest[];
}
