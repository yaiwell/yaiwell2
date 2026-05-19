import { useTranslations } from 'next-intl';

import { cn } from '@/lib/utils';

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
  variant = 'subtle',
}: AvailabilityBadgeProps) {
  const t = useTranslations('search.availability');

  const label =
    status === 'available_now'
      ? t('now')
      : status === 'available_soon'
        ? t('soon', { minutes: minutesUntilNext ?? 0 })
        : t('busy');

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
