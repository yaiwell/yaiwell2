import { useLocale, useTranslations } from 'next-intl';

import { cn } from '@/lib/utils';

import { formatSlotTime } from './AvailabilityBadge.logic';
import { availabilityBadgeStyles as s } from './AvailabilityBadge.styles';
import type { AvailabilityBadgeProps } from './AvailabilityBadge.types';

/**
 * Píldora visual con el estado de disponibilidad de un proveedor.
 *
 * Es un componente puro: recibe `status` y opcionalmente los minutos
 * restantes y elige el texto y la paleta. Sin estado interno.
 *
 * Razón de no marcar `'use client'`: solo lee el contexto i18n a través
 * de `useTranslations`, que funciona también en Server Components.
 */
export function AvailabilityBadge({
  status,
  minutesUntilNext,
  nextSlotAt,
  variant = 'subtle',
}: AvailabilityBadgeProps) {
  const t = useTranslations('search.availability');
  const locale = useLocale();

  // Cuando está ocupado pero SÍ hay hueco más tarde, damos la hora en
  // vez de "Sin hueco hoy": con el ámbar limitado a una hora, un centro
  // libre a las 19:00 visto a las 10:00 caería en `busy` y el copy
  // genérico sería directamente falso.
  const busyLabel = nextSlotAt
    ? t('busyWithLater', { time: formatSlotTime(nextSlotAt, locale) })
    : t('busy');

  const label =
    status === 'available_now'
      ? t('now')
      : status === 'available_soon'
        ? t('soon', { minutes: minutesUntilNext ?? 0 })
        : busyLabel;

  const variantClasses = variant === 'solid' ? s.solid[status] : s.subtle[status];

  return (
    <span
      className={cn(s.base, variantClasses)}
      role="status"
      aria-label={label}
      data-component={`availability-badge-${status.replace('_', '-')}`}
    >
      <span className={cn(s.dot, s.dotColor[status])} aria-hidden />
      {label}
    </span>
  );
}
