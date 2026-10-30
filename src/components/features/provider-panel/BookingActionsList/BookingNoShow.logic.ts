import type { NoShowActionErrorCode } from '@/app/[locale]/panel/calendario/no-show-errors';

/**
 * Traducción de los códigos de las acciones de no presentado a las
 * claves de copy de cada diálogo. Fuera de los componentes para que el
 * JSX no ramifique y para probarlo sin montar nada.
 */

/** Claves de `providerPanel.calendar.actions.noShow.errors`. */
export type MarkNoShowErrorKey =
  | 'notFound'
  | 'forbidden'
  | 'notConfirmed'
  | 'notStarted'
  | 'windowClosed'
  | 'internal';

/** Claves de `providerPanel.calendar.actions.undoNoShow.errors`. */
export type UndoNoShowErrorKey =
  | 'notFound'
  | 'forbidden'
  | 'notNoShow'
  | 'windowClosed'
  | 'slotTaken'
  | 'internal';

/** Error de «No se presentó» → copy. */
export function markNoShowErrorKey(code: NoShowActionErrorCode): MarkNoShowErrorKey {
  switch (code) {
    case 'NOT_FOUND':
      return 'notFound';
    case 'FORBIDDEN':
      return 'forbidden';
    case 'NOT_CONFIRMED':
      return 'notConfirmed';
    case 'NOT_STARTED':
      return 'notStarted';
    case 'WINDOW_CLOSED':
      return 'windowClosed';
    default:
      return 'internal';
  }
}

/** Error de «Deshacer» → copy. */
export function undoNoShowErrorKey(code: NoShowActionErrorCode): UndoNoShowErrorKey {
  switch (code) {
    case 'NOT_FOUND':
      return 'notFound';
    case 'FORBIDDEN':
      return 'forbidden';
    case 'NOT_NO_SHOW':
      return 'notNoShow';
    case 'UNDO_WINDOW_CLOSED':
      return 'windowClosed';
    case 'SLOT_TAKEN':
      return 'slotTaken';
    default:
      return 'internal';
  }
}
