import type { useTranslations } from 'next-intl';

import type { BookingPaymentMethod, BookingStep } from './BookingFlow.types';

/**
 * Orden de los pasos del flujo de reserva y navegación entre ellos.
 * Fuente única para el hook, el componente y el indicador visual; va
 * aparte para que `BookingFlow.logic.ts` no pase de las ~250 líneas.
 */
export const BOOKING_STEPS: readonly BookingStep[] = [
  'slot',
  'summary',
  'payment',
  'confirmation',
] as const;

/** Paso siguiente; en el último (o uno desconocido) no se mueve. */
export function nextStep(current: BookingStep): BookingStep {
  const idx = BOOKING_STEPS.indexOf(current);
  if (idx < 0 || idx >= BOOKING_STEPS.length - 1) return current;
  return BOOKING_STEPS[idx + 1];
}

/** Paso anterior; en el primero no se mueve. */
export function previousStep(current: BookingStep): BookingStep {
  const idx = BOOKING_STEPS.indexOf(current);
  if (idx <= 0) return current;
  return BOOKING_STEPS[idx - 1];
}

/**
 * Título del paso activo.
 *
 * Con claves literales para que next-intl pueda validarlas en tiempo de
 * compilación: un mapa con `string` rompería el typecheck del template
 * strict de mensajes.
 *
 * @param t — traductor de `booking.flow`.
 * @param step — paso activo.
 * @param paymentMethod — método efectivo (el paso de pago cambia de título).
 */
export function resolveStepTitle(
  t: ReturnType<typeof useTranslations<'booking.flow'>>,
  step: BookingStep,
  paymentMethod: BookingPaymentMethod,
): string {
  switch (step) {
    case 'slot':
      return t('steps.slot');
    case 'summary':
      return t('steps.summary');
    case 'payment':
      return paymentMethod === 'onsite' ? t('steps.onsite') : t('steps.payment');
    case 'confirmation':
      return t('steps.confirmation');
  }
}
