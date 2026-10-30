/**
 * API pública de las notificaciones por email. Solo servidor.
 */
import 'server-only';

export {
  notifyBookingCancelledByProvider,
  notifyBookingCompleted,
  notifyBookingConfirmed,
  notifyLatePaymentRefunded,
  notifyProviderApproved,
  notifyProviderRejected,
  notifyRefundCompleted,
  notifyRefundDelayed,
} from './notifications.service';
export { notifyBookingCancelledByClient } from './notifications.client-cancellation';
export { notifyBookingNoShow, notifyNoShowUndone } from './notifications.no-show';
export { notifyPlanDowngraded, notifyPlanPaymentFailed } from './notifications.billing';
export { notifyCommissionPaymentFailed } from './notifications.commission';
export {
  REVIEW_INVITE_MAX_AGE_DAYS,
  selectReviewInviteCandidates,
  sendReviewInvites,
  type ReviewInviteSummary,
} from './notifications.review-invites';
export { sendTomorrowReminders, type ReminderSweepSummary } from './notifications.reminders';
export { scheduleNotification } from './notifications.schedule';
export { toCancellationRefundState } from './notifications.refund-state';
export type { CancellationRefundState, NoShowNotice } from './notifications.types';
