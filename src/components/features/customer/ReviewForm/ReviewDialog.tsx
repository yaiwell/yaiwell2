'use client';

import { Star, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Dialog } from 'radix-ui';

import { Button } from '@/components/ui/button';

import { useReviewDialog } from './ReviewDialog.logic';
import { ReviewForm } from './ReviewForm';
import { reviewFormStyles as s } from './ReviewForm.styles';
import type { ReviewDialogProps } from './ReviewForm.types';

/**
 * CTA «Valorar» de la card y el diálogo que abre con el formulario.
 *
 * Radix Dialog aporta el foco atrapado, `Escape` para cerrar y la
 * devolución del foco al CTA. El contenido solo se monta al abrir, así
 * que cada apertura empieza con el formulario limpio.
 *
 * La card solo renderiza este componente cuando `booking.canReview`
 * (calculado en el servicio): aquí no se vuelve a decidir si se puede.
 */
export function ReviewDialog({ bookingId, serviceName, providerName }: ReviewDialogProps) {
  const t = useTranslations('customerArea');
  const { open, setOpen, close } = useReviewDialog();

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <Button size="lg" data-component={`customer-booking-review-${bookingId}`}>
          <Star className="size-4" aria-hidden="true" />
          {t('actions.review')}
        </Button>
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Overlay className={s.overlay} />
        <Dialog.Content
          className={s.content}
          data-component={`customer-review-dialog-${bookingId}`}
        >
          <div className={s.header}>
            <div className={s.titleBlock}>
              <Dialog.Title className={s.title}>{t('reviewForm.title')}</Dialog.Title>
              <Dialog.Description className={s.subtitle}>
                {t('reviewForm.description', { service: serviceName, provider: providerName })}
              </Dialog.Description>
            </div>
            <Dialog.Close className={s.closeButton} aria-label={t('reviewForm.close')}>
              <X className="size-4" aria-hidden="true" />
            </Dialog.Close>
          </div>
          <ReviewForm bookingId={bookingId} onClose={close} />
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
