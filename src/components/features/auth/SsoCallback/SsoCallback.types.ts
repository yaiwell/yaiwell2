/**
 * Props de la pantalla de vuelta de Google. Las rutas llegan ya con el
 * prefijo de idioma y el `redirect_url` saneado desde la page.
 */
export interface SsoCallbackProps {
  /** Destino al terminar (`/entrar`, que reparte por rol). */
  completeUrl: string;
  signInUrl: string;
  signUpUrl: string;
}
