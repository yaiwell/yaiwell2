'use client';

import { useState, useTransition } from 'react';

import { toggleServiceActiveAction } from '@/app/[locale]/panel/servicios/actions';
import { Button } from '@/components/ui/button';
import type { AppLocale } from '@/i18n/routing';

import { PlanLimitNotice } from '../PlanLimitNotice';
import { serviceToggleButtonStyles as s } from './ServiceToggleButton.styles';

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
 *
 * Si reactivar choca con el límite del plan (`PLAN_LIMIT_REACHED`),
 * muestra el aviso con el enlace para mejorarlo.
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
  const [planLimitReached, setPlanLimitReached] = useState(false);

  function handleClick() {
    setPlanLimitReached(false);
    startTransition(async () => {
      const result = await toggleServiceActiveAction(locale, serviceId, !isActive);
      setPlanLimitReached(!result.ok && result.code === 'PLAN_LIMIT_REACHED');
    });
  }

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        disabled={isPending}
        onClick={handleClick}
        data-component={`services-list-toggle-${serviceId}`}
      >
        {isPending ? pendingLabel : isActive ? pauseLabel : resumeLabel}
      </Button>
      {planLimitReached ? (
        <div className={s.noticeWrapper}>
          <PlanLimitNotice />
        </div>
      ) : null}
    </>
  );
}
