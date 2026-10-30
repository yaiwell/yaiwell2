/**
 * Errores tipados del cobro de comisiones del pago en el local.
 */

/**
 * Se quiso activar el pago en el local sin un método de pago guardado
 * para cobrar las comisiones (CLAUDE.md §4.bis, decidido 2026-10-30).
 */
export class OnsitePaymentMethodMissingError extends Error {
  readonly code = 'ONSITE_PAYMENT_METHOD_MISSING';

  constructor(message = 'The provider has no payment method for onsite commissions.') {
    super(message);
    this.name = 'OnsitePaymentMethodMissingError';
  }
}

/**
 * Se quiso activar el pago en el local con comisiones impagadas: queda
 * suspendido hasta que se cobre la factura (§4.bis).
 */
export class OnsiteCommissionDebtError extends Error {
  readonly code = 'ONSITE_COMMISSION_DEBT';

  constructor(message = 'The provider has unpaid onsite commissions.') {
    super(message);
    this.name = 'OnsiteCommissionDebtError';
  }
}
