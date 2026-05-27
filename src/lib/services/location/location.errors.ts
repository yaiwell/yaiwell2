/**
 * Errores tipados del dominio "location".
 *
 * Lanzamos clases específicas (siguiendo el patrón de `providers.errors.ts`
 * y `booking.errors.ts`) para que el caller decida cómo manejar cada caso
 * sin parsear strings.
 *
 * Los `code` son estables y se usan también como `LocationErrorCode` en la
 * UI (banner, modal de permisos) para decidir el copy a mostrar.
 */

export class PermissionDeniedError extends Error {
  readonly code = 'PERMISSION_DENIED';

  constructor(message = 'User denied geolocation permission.') {
    super(message);
    this.name = 'PermissionDeniedError';
  }
}

export class PositionUnavailableError extends Error {
  readonly code = 'POSITION_UNAVAILABLE';

  constructor(message = 'Geolocation position is unavailable.') {
    super(message);
    this.name = 'PositionUnavailableError';
  }
}

export class TimeoutError extends Error {
  readonly code = 'TIMEOUT';

  constructor(message = 'Geolocation request timed out.') {
    super(message);
    this.name = 'TimeoutError';
  }
}

export class NotSupportedError extends Error {
  readonly code = 'NOT_SUPPORTED';

  constructor(message = 'Geolocation API is not supported by this browser.') {
    super(message);
    this.name = 'NotSupportedError';
  }
}
