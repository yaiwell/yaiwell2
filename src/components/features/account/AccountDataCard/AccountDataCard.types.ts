/**
 * Tipos del bloque «Tus datos» de `/cuenta`.
 */
export interface AccountDataCardProps {
  /** Idioma actual: a dónde vuelve el usuario tras eliminar la cuenta. */
  locale: string;
}

/** Códigos de error que el bloque sabe explicar. */
export type AccountDataErrorCode =
  | 'admin'
  | 'provider'
  | 'open_bookings'
  | 'open_refunds'
  | 'unauthenticated'
  | 'internal';
