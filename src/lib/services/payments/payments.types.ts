/**
 * Tipos del dominio `payments` (integración Stripe Connect).
 *
 * El módulo cubre el onboarding del Provider a una cuenta conectada
 * de tipo Express. El flujo de cobro (PaymentIntent + capture + refund)
 * llegará en una iteración posterior.
 */

/**
 * Estado de habilitación de una cuenta Stripe Connect.
 *
 * No cacheamos esto en BD: una cuenta puede pasar de habilitada a
 * deshabilitada por requerimientos de Stripe (KYC vencido, requisitos
 * pendientes) sin que nuestro servidor se entere. La fuente de verdad
 * es siempre la API de Stripe; consultamos bajo demanda.
 */
export interface ConnectAccountStatus {
  /** Existe la cuenta conectada en Stripe. */
  exists: boolean;
  /** El usuario completó el onboarding y firmó los TOS. */
  detailsSubmitted: boolean;
  /** Stripe permite cobrar en nombre de esta cuenta. */
  chargesEnabled: boolean;
  /** Stripe permite hacer payouts a esta cuenta. */
  payoutsEnabled: boolean;
  /**
   * Requisitos pendientes que bloquean cobros o payouts. La UI lo
   * muestra como "completa el alta en Stripe" — no detallamos cada
   * requisito porque cambian con frecuencia y Stripe los presenta
   * mejor en su propio onboarding.
   */
  hasPendingRequirements: boolean;
}

/**
 * URL devuelta por `createConnectOnboardingLink`. Es temporal (Stripe
 * la expira en ~5 minutos) y de un solo uso para esa sesión de
 * onboarding. La UI redirige al usuario directamente — no la guardamos.
 */
export interface ConnectOnboardingLink {
  url: string;
  /** Timestamp Unix de expiración, informativo. */
  expiresAt: number;
}
