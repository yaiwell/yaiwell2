/**
 * Tipos del dominio `checkout` (cobro real de una reserva).
 *
 * El módulo cose tres piezas que ya existían por separado: la creación
 * de la reserva (`booking`), la cuenta conectada del proveedor
 * (`payments`) y el PaymentIntent de Stripe. Vive aparte de `payments`
 * porque aquel cubre el **onboarding** del proveedor y este el **cobro
 * al cliente**: distintos actores, distintos errores, distinta UI.
 */

/**
 * Resultado de abrir el checkout de una reserva.
 *
 * `clientSecret` es lo único que viaja al navegador para montar Stripe
 * Elements. No es un secreto de plataforma: sólo autoriza a confirmar
 * ese PaymentIntent concreto, así que exponerlo al cliente dueño de la
 * reserva es el uso previsto por Stripe.
 */
export interface BookingCheckoutSession {
  bookingId: string;
  clientSecret: string;
  /** Importe total en céntimos, para que la UI lo pinte sin recalcular. */
  amountCents: number;
  /** Inicio del slot ya confirmado en BD (puede diferir del pedido si hubo redondeo). */
  slotStartIso: string;
  slotEndIso: string;
}

/**
 * Resultado de procesar un evento de Stripe sobre una reserva.
 *
 * `changed` distingue "he aplicado la transición" de "el evento era un
 * reintento y la reserva ya estaba en ese estado". El webhook lo usa
 * para devolver `handled` sin mentir en los logs.
 */
export interface BookingTransitionResult {
  bookingId: string;
  changed: boolean;
  /** Estado en el que queda la reserva tras procesar el evento. */
  status: string;
}
