/**
 * Errores tipados de la integración Supabase Storage.
 *
 * El consumidor (route handler, server action) puede hacer narrowing
 * con `instanceof` para devolver respuestas HTTP coherentes sin parsear
 * mensajes de error.
 */

export class StorageConfigError extends Error {
  readonly code = 'STORAGE_CONFIG_MISSING';
  constructor(message = 'Faltan variables de entorno para Supabase Storage.') {
    super(message);
  }
}

export class StorageUploadError extends Error {
  readonly code = 'STORAGE_UPLOAD_FAILED';
  /**
   * Mensaje crudo devuelto por el SDK de Supabase, útil para depurar
   * en Sentry sin romper la API pública del error.
   */
  readonly cause?: unknown;
  constructor(message = 'No se pudo subir el archivo a Storage.', cause?: unknown) {
    super(message);
    this.cause = cause;
  }
}

export class StorageDeleteError extends Error {
  readonly code = 'STORAGE_DELETE_FAILED';
  readonly cause?: unknown;
  constructor(message = 'No se pudo borrar el archivo de Storage.', cause?: unknown) {
    super(message);
    this.cause = cause;
  }
}
