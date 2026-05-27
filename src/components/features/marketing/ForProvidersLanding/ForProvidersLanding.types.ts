/**
 * Props del orquestador de la landing /profesionales.
 *
 * El componente es presentacional: no recibe datos de servidor en
 * MVP. Mantenemos la interfaz abierta por si en el futuro queremos
 * variantes (ej. preselección de plan vía URL).
 */
export interface ForProvidersLandingProps {
  /**
   * Plan preseleccionado opcional, para resaltar visualmente uno
   * concreto cuando la URL lo indica. Si no se pasa, se aplica el
   * destacado por defecto ("Pro" como popular).
   */
  highlightedPlan?: 'free' | 'basic' | 'pro' | 'premium';
}
