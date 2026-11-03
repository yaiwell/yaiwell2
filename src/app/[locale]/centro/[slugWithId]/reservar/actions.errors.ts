import { ZodError } from 'zod';

import {
  ServiceNotFoundError,
  ServicePausedError,
  SlotUnavailableError,
  isBookingTooSoonError,
} from '@/lib/services/booking';
import {
  PaymentIntentCreationError,
  ProfessionalNotResolvedError,
  ProviderNotChargeableError,
} from '@/lib/services/checkout';
import { StripeOperationError } from '@/lib/services/payments';

import type { CheckoutErrorCode } from './actions';

/**
 * Traduce los errores tipados del dominio a códigos de UI.
 *
 * Vive fuera de `actions.ts` (un módulo `'use server'` solo debe
 * exportar acciones) para que la action se lea de un vistazo, el
 * fichero no pase de las ~250 líneas y el mapeo se pueda testear sin
 * montar sesión de Clerk.
 *
 * @param professionalChosen — el cliente eligió profesional (no «cualquiera»).
 */
export function mapCheckoutError(error: unknown, professionalChosen = false): CheckoutErrorCode {
  // Va antes del ZodError genérico: el hueco ha dejado de respetar la
  // antelación mínima mientras el usuario rellenaba el flujo. No es un
  // input roto, y la acción útil es la misma que con SLOT_UNAVAILABLE:
  // elegir otra hora.
  if (isBookingTooSoonError(error)) {
    return 'SLOT_TOO_SOON';
  }
  if (error instanceof ZodError) {
    return 'VALIDATION';
  }
  // Con profesional elegido, «no hay a quién asignarlo» casi siempre es
  // que ese profesional ya no presta el servicio: salida propia.
  if (professionalChosen && error instanceof ProfessionalNotResolvedError) {
    return 'PROFESSIONAL_UNAVAILABLE';
  }
  // Servicio borrado, pausado o sin profesional al que asignarlo: desde
  // la perspectiva del cliente son el mismo problema, "esto ya no se
  // puede reservar".
  if (
    error instanceof ServiceNotFoundError ||
    error instanceof ServicePausedError ||
    error instanceof ProfessionalNotResolvedError
  ) {
    return 'SERVICE_UNAVAILABLE';
  }
  if (error instanceof SlotUnavailableError) {
    return 'SLOT_UNAVAILABLE';
  }
  if (error instanceof ProviderNotChargeableError) {
    return 'PROVIDER_NOT_CHARGEABLE';
  }
  if (error instanceof PaymentIntentCreationError || error instanceof StripeOperationError) {
    console.error('[reservar/actions] Stripe rechazó el checkout:', error.cause ?? error);
    return 'PAYMENT_FAILED';
  }
  console.error('[reservar/actions] error inesperado al abrir el checkout:', error);
  return 'INTERNAL';
}
