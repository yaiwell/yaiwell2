/**
 * Tipos específicos del pill de ubicación del Header.
 *
 * El popover asociado renderiza distinto contenido según el estado
 * actual del provider. Centralizamos aquí los aliases que se usan
 * tanto en la lógica como en la UI.
 */

import type { LocationStatus } from '@/lib/services/location';

export interface LocationPillProps {
  /** Permite añadir clases extra desde el contenedor (Header). */
  className?: string;
}

/**
 * Estado visual derivado del `LocationStatus` del provider.
 *
 * Agrupamos `idle` y `fallback` bajo el mismo bucket porque la UI los
 * trata igual (mostramos "Barcelona — predeterminado" y ofrecemos
 * activar ubicación). De este modo los `switch` en la UI no necesitan
 * branches repetidos.
 */
export type PillVisualState =
  | 'default' // idle o fallback (sin GPS)
  | 'requesting'
  | 'granted'
  | 'denied'
  | 'unavailable';

/** Mapea el status real del provider al visual state simplificado. */
export function toVisualState(status: LocationStatus): PillVisualState {
  switch (status) {
    case 'granted':
      return 'granted';
    case 'requesting':
    case 'prompting':
      return 'requesting';
    case 'denied':
      return 'denied';
    case 'unavailable':
      return 'unavailable';
    case 'idle':
    case 'fallback':
    default:
      return 'default';
  }
}
