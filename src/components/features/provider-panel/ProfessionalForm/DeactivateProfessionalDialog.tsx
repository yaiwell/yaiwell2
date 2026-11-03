'use client';

import { CalendarDays, UserMinus } from 'lucide-react';
import { useFormatter, useTranslations } from 'next-intl';
import { AlertDialog } from 'radix-ui';

import type { BlockingBookingDto } from '@/app/[locale]/panel/equipo/actions.errors';
import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';
import { BUSINESS_TIMEZONE } from '@/lib/services/availability/availability.client';
import { pickLocalized } from '@/lib/i18n/pickLocalized';

import { professionalFormStyles as s } from './ProfessionalForm.styles';
import type { ProfessionalNotice, SupportedLocale } from './ProfessionalForm.types';

interface DeactivateProfessionalDialogProps {
  locale: SupportedLocale;
  name: string;
  bookings: BlockingBookingDto[];
  notice: ProfessionalNotice | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  isPending: boolean;
}

/**
 * Confirmación de baja de un profesional.
 *
 * Si tiene citas futuras las lista y no deja confirmar: primero hay que
 * cancelarlas desde el calendario (regla de 2 h y devolución, CLAUDE.md
 * §4.bis). El servidor vuelve a comprobarlo al confirmar.
 */
export function DeactivateProfessionalDialog({
  locale,
  name,
  bookings,
  notice,
  open,
  onOpenChange,
  onConfirm,
  isPending,
}: DeactivateProfessionalDialogProps) {
  const t = useTranslations('providerPanel.team');
  const format = useFormatter();
  const hasBookings = bookings.length > 0;
  const error = notice?.kind === 'error' ? notice : null;

  return (
    <AlertDialog.Root open={open} onOpenChange={onOpenChange}>
      <AlertDialog.Trigger asChild>
        <Button
          type="button"
          variant="ghost"
          className={s.destructiveTrigger}
          data-component="professional-deactivate"
        >
          <UserMinus className="size-4" aria-hidden />
          {t('deactivate.button')}
        </Button>
      </AlertDialog.Trigger>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className={s.overlay} />
        <AlertDialog.Content className={s.dialog} data-component="professional-deactivate-dialog">
          <AlertDialog.Title className={s.dialogTitle}>
            {t('deactivate.title', { name })}
          </AlertDialog.Title>
          <AlertDialog.Description className={s.dialogText}>
            {t('deactivate.description')}
          </AlertDialog.Description>

          {hasBookings ? (
            <div className={s.bookingsBlock} data-component="professional-blocking-bookings">
              <p className={s.label}>{t('deactivate.bookingsTitle')}</p>
              <ul className={s.bookingList}>
                {bookings.map((booking) => (
                  <li key={booking.id}>
                    {format.dateTime(new Date(booking.startAt), {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                      timeZone: BUSINESS_TIMEZONE,
                    })}
                    {' · '}
                    {pickLocalized(booking.serviceName, locale)}
                  </li>
                ))}
              </ul>
              <p className={s.hint}>{t('deactivate.bookingsHelp')}</p>
              <Link href="/panel/calendario" className={s.dialogLink}>
                <CalendarDays className="size-4" aria-hidden />
                {t('deactivate.calendarLink')}
              </Link>
            </div>
          ) : null}

          {error && error.code !== 'HAS_FUTURE_BOOKINGS' ? (
            <div role="alert" className={s.errorNotice}>
              <p>{t(`errors.${error.code}`)}</p>
              {error.services?.length ? (
                <ul className={s.errorList}>
                  {error.services.map((service) => (
                    <li key={service.id}>{pickLocalized(service.name, locale)}</li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : null}

          <div className={s.dialogActions}>
            <AlertDialog.Cancel asChild>
              <Button type="button" variant="outline" disabled={isPending}>
                {t('deactivate.cancel')}
              </Button>
            </AlertDialog.Cancel>
            {/* Sin AlertDialog.Action: cerraría el diálogo aunque falle. */}
            <Button
              type="button"
              variant="destructive"
              disabled={isPending || hasBookings}
              onClick={onConfirm}
              data-component="professional-deactivate-confirm"
            >
              {isPending ? t('deactivate.pending') : t('deactivate.confirm')}
            </Button>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
