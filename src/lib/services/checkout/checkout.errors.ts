/**
 * Errores tipados del dominio `checkout`.
 *
 * Cada error expone un `code` estable para que la server action lo
 * mapee a copy i18n sin parsear mensajes. Los errores de reserva
 * propiamente dichos (slot ocupado, servicio pausado, antelación) los
 * sigue lanzando `booking.service` y se propagan tal cual.
 */

/**
 * El proveedor no puede cobrar todavía: o no ha conectado su cuenta
 * Stripe, o la tiene conectada pero Stripe aún no habilita cargos
 * (KYC incompleto, requisitos pendientes).
 *
 * Es un error de negocio, no un fallo técnico: lo comprobamos **antes**
 * de crear la reserva para no dejar un `pending` huérfano bloqueando el
 * slot de un centro que no puede cobrar.
 */
export class ProviderNotChargeableError extends Error {
  readonly code = 'PROVIDER_NOT_CHARGEABLE';

  constructor(message = 'El proveedor todavía no puede aceptar pagos.') {
    super(message);
    this.name = 'ProviderNotChargeableError';
  }
}

/**
 * No hay ningún profesional al que imputar la reserva: ni el servicio
 * lo tiene asignado ni el proveedor tiene profesionales activos. Caso
 * patológico que el wizard de onboarding no debería permitir, pero que
 * cortamos aquí porque `Booking.professionalId` es obligatorio.
 */
export class ProfessionalNotResolvedError extends Error {
  readonly code = 'PROFESSIONAL_NOT_RESOLVED';

  constructor(message = 'El proveedor no tiene profesionales activos para este servicio.') {
    super(message);
    this.name = 'ProfessionalNotResolvedError';
  }
}

/**
 * Stripe rechazó la creación del PaymentIntent. La reserva que se
 * había creado justo antes se cancela para liberar el slot: preferimos
 * perder la reserva a bloquear una franja que nadie va a pagar.
 */
export class PaymentIntentCreationError extends Error {
  readonly code = 'PAYMENT_INTENT_FAILED';

  constructor(message = 'No se pudo iniciar el pago.', cause?: unknown) {
    super(message);
    this.name = 'PaymentIntentCreationError';
    if (cause !== undefined) {
      (this as Error & { cause?: unknown }).cause = cause;
    }
  }
}

/**
 * Stripe rechazó la emisión del reembolso tras una cancelación del
 * proveedor.
 *
 * A diferencia de `PaymentIntentCreationError`, este error **no** se
 * propaga al caller: la cancelación ya está comprometida en BD y no se
 * revierte (el hueco está liberado y otro cliente puede haberlo cogido).
 * Se usa como payload hacia Sentry y como vocabulario estable para que
 * la UI explique que el dinero sigue pendiente de devolver, con el
 * reintento en manos de soporte.
 */
export class RefundFailedError extends Error {
  readonly code = 'REFUND_FAILED';

  constructor(message = 'No se pudo emitir el reembolso de la reserva.', cause?: unknown) {
    super(message);
    this.name = 'RefundFailedError';
    if (cause !== undefined) {
      (this as Error & { cause?: unknown }).cause = cause;
    }
  }
}

/**
 * No hay nada que reembolsar en esta reserva: estaba en `pending` (el
 * PaymentIntent nunca llegó a confirmarse) o no tiene cargo anclado.
 *
 * Es un desenlace legítimo, no un fallo: cancelar una reserva sin pagar
 * simplemente libera el hueco. Existe como código tipado para que la UI
 * pueda distinguirlo de un reembolso emitido y no prometa al cliente un
 * abono que nunca va a llegar.
 */
export class RefundNotApplicableError extends Error {
  readonly code = 'REFUND_NOT_APPLICABLE';

  constructor(message = 'La reserva no tiene ningún cobro que reembolsar.') {
    super(message);
    this.name = 'RefundNotApplicableError';
  }
}

/**
 * Un evento de Stripe llegó con un `bookingId` en metadata que no
 * existe en BD. Ocurre si se reprocesan eventos de un entorno contra
 * la base de otro. El webhook lo trata como no-op con 200 para que
 * Stripe deje de reintentar.
 */
export class BookingForCheckoutNotFoundError extends Error {
  readonly code = 'BOOKING_FOR_CHECKOUT_NOT_FOUND';

  constructor(message = 'La reserva referenciada por el pago no existe.') {
    super(message);
    this.name = 'BookingForCheckoutNotFoundError';
  }
}

/**
 * El evento de Stripe no trae `bookingId` en metadata ni permite
 * derivarlo. Sin esa referencia no podemos actuar sobre ninguna
 * reserva; el webhook lo registra y responde 200 sin tocar nada.
 */
export class MissingBookingReferenceError extends Error {
  readonly code = 'MISSING_BOOKING_REFERENCE';

  constructor(message = 'El evento de Stripe no referencia ninguna reserva.') {
    super(message);
    this.name = 'MissingBookingReferenceError';
  }
}
