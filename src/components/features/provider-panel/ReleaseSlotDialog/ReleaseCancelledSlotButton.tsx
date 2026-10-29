'use client';

import { BadgePercent } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';

import { releaseSlotStyles as s } from './ReleaseSlotDialog.styles';
import type { ReleaseCancelledSlotButtonProps } from './ReleaseSlotDialog.types';
import { useReleaseSlotPrompt } from './ReleaseSlotPrompt.logic';

/**
 * Botón «Liberar con descuento» de una reserva cancelada del listado.
 *
 * Abre el mismo diálogo que aparece justo después de que el centro
 * cancele, en modo «hueco de una reserva cancelada». Así una reserva que
 * canceló el cliente (o una cancelación propia en la que se pulsó
 * «Omitir») tiene la misma opción. Las reglas las aplica el servidor.
 */
export function ReleaseCancelledSlotButton({
  bookingId,
  startAtIso,
  disabled = false,
}: ReleaseCancelledSlotButtonProps) {
  const t = useTranslations('providerPanel.calendar.slotOffers.free');
  const openPrompt = useReleaseSlotPrompt();

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className={s.trigger}
      disabled={disabled || !openPrompt}
      onClick={() => openPrompt?.({ target: { kind: 'cancelled', bookingId, startAtIso } })}
      data-component={`booking-actions-release-${bookingId}`}
    >
      <BadgePercent className={s.triggerIcon} aria-hidden />
      {t('release')}
    </Button>
  );
}
