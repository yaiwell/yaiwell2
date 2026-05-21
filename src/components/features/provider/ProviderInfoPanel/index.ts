/**
 * Fachada del módulo ProviderInfoPanel.
 * `ProviderInfoMap` queda intencionalmente fuera del re-export
 * porque es un detalle interno (se monta vía dynamic import).
 */
export { ProviderInfoPanel } from './ProviderInfoPanel';
export type { ProviderInfoPanelProps } from './ProviderInfoPanel.types';
