'use client';

import { useTransition } from 'react';

import { toggleServiceActiveAction } from '@/app/[locale]/panel/servicios/actions';
import { Button } from '@/components/ui/button';
import type { AppLocale } from '@/i18n/routing';

interface ServiceToggleButtonProps {
  locale: AppLocale;
  serviceId: string;
  isActive: boolean;
  pauseLabel: string;
  resumeLabel: string;
  pendingLabel: string;
}

/**
 * Botón cliente que alterna `Service.isActive` vía server action.
 *
 * Vive aparte del `ServicesList` (Server Component) porque necesita
 * `useTransition` para el estado de loading. Recibe los labels ya
 * traducidos desde el server para no doblar la dependencia de i18n
 * en el cliente.
 */
export function ServiceToggleButton({
  locale,
  serviceId,
  isActive,
  pauseLabel,
  resumeLabel,
  pendingLabel,
}: ServiceToggleButtonProps) {
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    startTransition(async () => {
      await toggleServiceActiveAction(locale, serviceId, !isActive);
    });
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={isPending}
      onClick={handleClick}
      data-component={`services-list-toggle-${serviceId}`}
    >
      {isPending ? pendingLabel : isActive ? pauseLabel : resumeLabel}
    </Button>
  );
}
