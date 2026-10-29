/**
 * Estado de la suscripción del plan, compartido entre servidor y cliente
 * (el panel decide con él qué botón pinta en cada plan).
 */

/**
 * Estados en los que la suscripción sigue «viva» y da derecho al plan
 * pagado. Espejo client-safe de `LIVE_SUBSCRIPTION_STATUSES` del módulo
 * `billing` (que no se puede importar desde un Client Component); un
 * test comprueba que las dos listas no se separen.
 */
export const LIVE_SUBSCRIPTION_STATUS_VALUES = ['active', 'past_due'] as const;

/** Indica si un estado de suscripción mantiene vivo el plan pagado. */
export function isLiveSubscriptionStatus(status: string | null | undefined): boolean {
  return (
    typeof status === 'string' &&
    (LIVE_SUBSCRIPTION_STATUS_VALUES as readonly string[]).includes(status)
  );
}
