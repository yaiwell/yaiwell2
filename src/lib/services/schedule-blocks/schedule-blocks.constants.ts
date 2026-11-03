/**
 * Límites de los bloqueos de agenda (decididos con producto).
 *
 * Sin dependencias de servidor: el formulario del panel los usa para
 * acotar los selectores y el servidor para validar.
 */

/** Duración máxima de un bloqueo. La BD tiene un CHECK de 62 días como red. */
export const SCHEDULE_BLOCK_MAX_DAYS = 60;

/** Un bloqueo puede empezar como mucho a un año vista. */
export const SCHEDULE_BLOCK_MAX_LEAD_DAYS = 365;

/** Rejilla de horas: igual que la del selector del panel. */
export const SCHEDULE_BLOCK_STEP_MINUTES = 5;

/** Longitud máxima del motivo (CHECK en la migración 9g). */
export const SCHEDULE_BLOCK_REASON_MAX_LENGTH = 200;
