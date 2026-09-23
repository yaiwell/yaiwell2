/**
 * Tipos específicos del componente PhotoPlaceholder.
 *
 * El componente es puramente presentacional: no conoce el dominio, solo
 * el hueco visual que tiene que rellenar. Por eso no importa nada de
 * `/types/domain.ts`.
 */

/**
 * Tamaño del placeholder. Se elige en función del hueco que rellena:
 * `sm` para popups del mapa, `md` para cards de listado y `lg` para la
 * galería de la ficha de centro.
 */
export type PhotoPlaceholderSize = 'sm' | 'md' | 'lg';

export interface PhotoPlaceholderProps {
  /**
   * Texto visible bajo el icono, ya traducido por el consumidor.
   * Si se omite, el placeholder queda como decoración (`aria-hidden`):
   * es lo correcto cuando el contexto ya da la información (por ejemplo
   * una card que muestra el nombre del centro justo debajo).
   */
  label?: string;
  /** Tamaño del icono y del texto. Por defecto `md`. */
  size?: PhotoPlaceholderSize;
  /** Clases extra para ajustes puntuales del consumidor (bordes, radios). */
  className?: string;
  /** Valor del atributo `data-component`, usado por los tests E2E. */
  dataComponent?: string;
}
