/**
 * API pública de las notificaciones por email. Solo servidor.
 */
export {
  notifyBookingCancelledByProvider,
  notifyBookingCompleted,
  notifyBookingConfirmed,
  notifyLatePaymentRefunded,
  notifyProviderApproved,
  notifyProviderRejected,
} from './notifications.service';
export { scheduleNotification } from './notifications.schedule';
export { toCancellationRefundState } from './notifications.refund-state';
export type { CancellationRefundState } from './notifications.types';
