/**
 * Props del aviso de reserva de última hora.
 */
export interface LastMinuteNoticeProps {
  /**
   * - `policy`: texto completo de la política (resumen, paso 2).
   * - `compact`: «No reembolsable», encima del botón de pagar.
   */
  variant?: 'policy' | 'compact';
  /**
   * Id del contenedor, para que un control (el botón de pagar) pueda
   * referenciarlo con `aria-describedby`.
   */
  id?: string;
}
