import { useTranslations } from 'next-intl';

import { CancelBookingDialog } from '@/components/features/customer/CancelBookingDialog';

import { bookingCardStyles as s } from './BookingCard.styles';
import type { BookingCancellationActionProps } from './BookingCard.types';

/**
 * Lo que la card de «Próximas reservas» ofrece sobre cancelar, según el
 * veredicto que calcula el servidor (`booking.cancellation`): el botón
 * con su diálogo, o el motivo por el que no se puede.
 *
 * Server Component: solo elige qué pintar; lo interactivo vive en
 * `CancelBookingDialog`.
 */
export function BookingCancellationAction({
  booking,
  serviceName,
  whenLabel,
  amountLabel,
}: BookingCancellationActionProps) {
  const t = useTranslations('customerArea');
  const { cancellation } = booking;

  if (cancellation.kind === 'none') return null;

  if (cancellation.kind === 'allowed') {
    return (
      <CancelBookingDialog
        bookingId={booking.id}
        serviceName={serviceName}
        providerName={booking.providerName}
        startAtIso={booking.startAt.toISOString()}
        whenLabel={whenLabel}
        amountLabel={amountLabel}
        refundable={cancellation.refundCents !== null}
        enforceWindow={!cancellation.untilStart}
      />
    );
  }

  const hintKey = cancellation.kind === 'lastMinute' ? 'lastMinuteHint' : 'tooLateHint';
  return (
    <span className={s.blockedHint} data-component={`customer-booking-cancel-hint-${booking.id}`}>
      {t(`actions.${hintKey}`)}
    </span>
  );
}
