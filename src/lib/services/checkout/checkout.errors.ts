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
