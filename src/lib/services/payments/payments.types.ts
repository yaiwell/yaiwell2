/**
 * Tipos del dominio `payments` (integración Stripe Connect).
 *
 * El módulo cubre el alta del Provider como cuenta conectada Express:
 * creación de la cuenta, enlaces de onboarding alojados por Stripe,
 * lectura del estado y acceso al dashboard Express.
 */

/**
 * Forma jurídica con la que el proveedor se da de alta en Stripe.
 *
 *  - `individual`: autónomo. Stripe pide DNI/NIE e IBAN personal.
 *  - `company`: sociedad (S.L., S.A.…). Stripe pide CIF, administradores,
 *    titulares reales e IBAN de la sociedad.
 *
 * No ofrecemos `non_profit` ni `government_entity`: no son clientes
 * objetivo del marketplace y añadirían requisitos KYC que no hemos probado.
 */
export type ConnectBusinessType = 'individual' | 'company';

/**
 * Qué dashboard tiene la cuenta conectada. Decide qué acciones puede
 * ofrecer la UI: el AccountLink alojado y el login link solo tienen
 * sentido en cuentas Express creadas por este flujo.
 *
 *  - `express`: cuentas creadas por `ensureConnectAccount`.
 *  - `custom`: cuentas creadas a mano por API para pruebas (Studio Aura).
 *  - `standard` / `unknown`: no se esperan; se tratan como no gestionables.
 */
export type ConnectDashboardType = 'express' | 'custom' | 'standard' | 'unknown';

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
  /** El usuario completó el formulario de alta y aceptó los términos. */
  detailsSubmitted: boolean;
  /** Stripe permite cobrar en nombre de esta cuenta. */
  chargesEnabled: boolean;
  /** Stripe permite hacer payouts a esta cuenta. */
  payoutsEnabled: boolean;
  /**
   * Hay requisitos en `currently_due` o `past_due`. La UI lo muestra
   * como "completa los datos en Stripe" sin detallar cada campo: cambian
   * con frecuencia y Stripe los presenta mejor en su propio formulario.
   */
  hasPendingRequirements: boolean;
  /** Hay requisitos vencidos (`past_due`): algo ya está bloqueado. */
  hasPastDueRequirements: boolean;
  /** `requirements.disabled_reason` tal cual lo devuelve Stripe. */
  disabledReason: string | null;
  /**
   * Stripe ha deshabilitado la cuenta por un motivo que no se arregla
   * rellenando datos (rechazo, revisión manual, pausa de la plataforma…)
   * y se resuelve por soporte. Los motivos `requirements.*` NO cuentan:
   * son el alta normal (faltan datos o se están verificando).
   */
  isDisabled: boolean;
  /**
   * Forma jurídica leída de Stripe. `other` si Stripe devuelve un tipo
   * que no ofrecemos; `null` si aún no está fijada o no hay cuenta.
   */
  businessType: ConnectBusinessType | 'other' | null;
  /** Tipo de dashboard de la cuenta; `null` si no hay cuenta. */
  dashboardType: ConnectDashboardType | null;
}

/**
 * URL devuelta al crear un AccountLink. Es temporal (Stripe la expira
 * en pocos minutos) y de un solo uso. La UI redirige al usuario
 * directamente: no la guardamos.
 */
export interface ConnectOnboardingLink {
  url: string;
  /** Timestamp Unix de expiración, informativo. */
  expiresAt: number;
}

/** URLs absolutas a las que Stripe devuelve al usuario tras el alta. */
export interface ConnectReturnUrls {
  returnUrl: string;
  refreshUrl: string;
}
