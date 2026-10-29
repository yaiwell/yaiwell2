import type { BookingPayableActionState } from '@/app/[locale]/centro/[slugWithId]/reservar/hold-actions';

/**
 * Decisión del formulario de pago tras la comprobación de la retención.
 *
 * Va en su propio fichero, sin React ni Stripe, para poder probarla sin
 * montar Elements.
 */

/**
 * Qué hace el formulario después de preguntar al servidor.
 *
 *  - `proceed`: confirmar el pago con Stripe.
 *  - `paid`: ya está cobrada; pasar a la confirmación sin cobrar otra vez.
 *  - `expired`: la franja ya no es del cliente; no cobrar y ofrecer otra hora.
 */
export type HoldCheckDecision = 'proceed' | 'paid' | 'expired';

/**
 * Traduce la respuesta de `verifyBookingPayableAction` a una decisión.
 *
 * Solo bloquea el pago cuando el servidor **sabe** que la reserva ya no
 * se puede pagar. Si la comprobación misma falla (red, sesión caducada,
 * error interno) dejamos pagar: el intent sigue siendo válido y, si la
 * franja se hubiera perdido, el webhook reembolsa en automático. Bloquear
 * por un fallo nuestro costaría reservas legítimas.
 *
 * @param state — respuesta de la action, o `null` si la llamada falló.
 */
export function resolveHoldCheck(state: BookingPayableActionState | null): HoldCheckDecision {
  if (!state || state.ok) return 'proceed';
  switch (state.code) {
    case 'ALREADY_PAID':
      return 'paid';
    case 'HOLD_EXPIRED':
    case 'NOT_FOUND':
      return 'expired';
    case 'UNAUTHENTICATED':
    case 'VALIDATION':
    case 'INTERNAL':
      return 'proceed';
  }
}
