import type { AdminVerificationRequest } from '@/lib/services/verification';

export interface VerificationsQueueProps {
  /** Solicitudes pendientes ordenadas (las más recientes primero). */
  requests: AdminVerificationRequest[];
}
