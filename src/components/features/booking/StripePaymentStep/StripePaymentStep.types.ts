import type { AppLocale } from '@/i18n/routing';

/**
 * Tipos del paso de pago real con Stripe Elements.
 */

/**
 * Props del wrapper que monta `<Elements>`.
 *
 * `clientSecret` llega ya resuelto desde el orquestador: montar Elements
 * exige tenerlo, así que este componente sólo se renderiza cuando la
 * server action ha devuelto el checkout.
 */
export interface StripePaymentStepProps {
  clientSecret: string;
  amountCents: number;
  /** Precio de referencia congelado en la reserva; `null` sin descuento. */
  originalPriceCents: number | null;
  /** % de descuento congelado en la reserva; `null` sin descuento. */
  discountPct: number | null;
  locale: AppLocale;
  /**
   * Reserva de última hora (empieza en menos de 2 h): se paga ahora y no
   * admite devolución. El formulario lo avisa junto al botón de pagar.
   */
  isLastMinute: boolean;
  /** URL absoluta a la que Stripe devuelve al usuario tras un 3DS. */
  returnUrl: string;
  /** Se dispara cuando el pago se resuelve sin redirección. */
  onSucceeded: () => void;
}

/**
 * Props del formulario interno. Va separado del wrapper porque los hooks
 * `useStripe`/`useElements` sólo funcionan dentro del contexto que crea
 * `<Elements>`.
 */
export interface StripePaymentFormProps {
  amountCents: number;
  originalPriceCents: number | null;
  discountPct: number | null;
  locale: AppLocale;
  isLastMinute: boolean;
  returnUrl: string;
  onSucceeded: () => void;
}
