/**
 * Tipos del paso de pago mock.
 */

export interface MockPaymentStepProps {
  /** Importe total a pagar en céntimos. */
  amountCents: number;
  locale: 'es' | 'ca' | 'en' | 'de';
  /** Callback al confirmar el "pago" simulado. */
  onComplete: () => void;
}
