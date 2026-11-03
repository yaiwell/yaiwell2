'use client';

import { BadgePercent } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';

import { releaseSlotStyles as s } from './ReleaseSlotDialog.styles';
import type { ReleaseFreeSlotButtonProps } from './ReleaseSlotDialog.types';
import { useReleaseSlotPrompt } from './ReleaseSlotPrompt.logic';

/**
 * Botón «Liberar con descuento» de un hueco libre de las próximas 2 h.
 * Abre el diálogo compartido del calendario en modo «hueco libre».
 */
export function ReleaseFreeSlotButton({
  serviceId,
  serviceName,
  professionalId,
  professionalName = null,
  startAtIso,
  startTime,
  disabled = false,
}: ReleaseFreeSlotButtonProps) {
  const t = useTranslations('providerPanel.calendar.slotOffers.free');
  const tc = useTranslations('providerPanel.calendar');
  const openPrompt = useReleaseSlotPrompt();
  const ariaLabel = t('releaseAriaLabel', { service: serviceName, time: startTime });

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className={s.trigger}
      disabled={disabled || !openPrompt}
      aria-label={
        professionalName
          ? tc('withProfessional', { label: ariaLabel, professional: professionalName })
          : ariaLabel
      }
      onClick={() =>
        openPrompt?.({
          target: {
            kind: 'free',
            serviceId,
            startAtIso,
            serviceName,
            startTime,
            professionalId,
            professionalName,
          },
        })
      }
      data-component={`free-slot-release-${serviceId}-${startAtIso}`}
      data-professional-id={professionalId}
    >
      <BadgePercent className="size-3.5" aria-hidden />
      {t('release')}
    </Button>
  );
}
