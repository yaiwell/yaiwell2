/**
 * Errores tipados de la integración Mapbox.
 *
 * Permiten al caller distinguir entre "no hay token configurado"
 * (responder 501 / mostrar fallback) y "Mapbox respondió mal"
 * (responder 5xx / reintento exponencial).
 */

/**
 * Lanzado cuando intentas usar el servicio sin `NEXT_PUBLIC_MAPBOX_TOKEN`
 * configurado. Es esperable en local antes de pegar la key.
 */
export class MapboxConfigError extends Error {
  readonly code = 'MAPBOX_NOT_CONFIGURED';

  constructor(message = 'NEXT_PUBLIC_MAPBOX_TOKEN no está definido.') {
    super(message);
    this.name = 'MapboxConfigError';
  }
}

/**
 * Lanzado cuando la API de Mapbox responde con un status no-OK
 * (401 token inválido, 422 query mal formada, 429 rate limit, 5xx).
 *
 * Conservamos el `status` para que el caller decida si reintentar
 * (429/5xx → sí; 401/422 → no, es un bug de config).
 */
export class MapboxRequestError extends Error {
  readonly code = 'MAPBOX_REQUEST_FAILED';
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'MapboxRequestError';
    this.status = status;
  }
}
