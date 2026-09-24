/**
 * Tipos específicos del componente ErrorView.
 *
 * El componente es presentacional puro: recibe textos ya traducidos por
 * el boundary que lo monta, así que no conoce namespaces de i18n ni el
 * dominio. Por eso no importa nada de `/types/domain.ts`.
 */

/**
 * Registro visual del bloque de error.
 *
 *  - `page`: tarjeta editorial a pantalla completa, con el gradiente
 *    cálido de marca. Es la que ve un visitante en el árbol público.
 *  - `panel`: bloque compacto sin gradiente, pensado para renderizarse
 *    dentro del shell del panel del proveedor (que ya aporta sidebar y
 *    cabecera propias y no debe competir con un fondo de marca).
 */
export type ErrorViewVariant = 'page' | 'panel';

export interface ErrorViewProps {
  /** Registro visual. Por defecto `page`. */
  variant?: ErrorViewVariant;
  /** Titular del error, ya traducido. */
  title: string;
  /** Explicación breve de qué ha pasado y qué puede hacer el usuario. */
  description: string;
  /** Etiqueta del CTA primario ("Reintentar"). */
  retryLabel: string;
  /**
   * Handler del CTA primario. El boundary decide si reintenta con
   * `unstable_retry()` (re-fetch real) o con `reset()`.
   */
  onRetry: () => void;
  /** Etiqueta del CTA secundario. Si falta, el CTA no se pinta. */
  secondaryLabel?: string;
  /**
   * Destino del CTA secundario dentro de la app (sin prefijo de locale:
   * lo añade el `Link` de `@/i18n/navigation`). Obligatorio si hay
   * `secondaryLabel`.
   */
  secondaryHref?: string;
  /**
   * Hash generado por Next para el error. En producción es lo único que
   * permite cruzar lo que ve el usuario con la traza de Sentry.
   */
  digest?: string;
  /** Etiqueta del bloque de digest ("Código de error"), ya traducida. */
  digestLabel: string;
  /** Valor del atributo `data-component`, usado por los tests E2E. */
  dataComponent?: string;
}
