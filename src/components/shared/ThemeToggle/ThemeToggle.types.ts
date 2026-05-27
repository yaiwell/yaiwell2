import type { ThemePreference } from '@/lib/utils/theme';

/**
 * Tipos específicos del componente ThemeToggle.
 *
 * El componente expone tres modos (light / dark / system) reutilizando el
 * tipo `ThemePreference` para mantener una única fuente de verdad.
 */

export interface ThemeToggleProps {
  /**
   * Si es true, oculta la etiqueta de texto y muestra solo el icono.
   * Útil en barras estrechas como el Header mobile.
   */
  compact?: boolean;

  /** Clase adicional opcional para integrarse con contenedores externos. */
  className?: string;
}

export interface ThemeOption {
  value: ThemePreference;
  labelKey: 'light' | 'dark' | 'system';
}
