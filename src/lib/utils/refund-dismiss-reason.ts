/**
 * Límites del motivo al descartar una entrada de la cola de reembolsos.
 *
 * Viven en `utils` (sin dependencias de servidor) porque los comparten
 * el schema Zod del dominio `checkout` y el formulario cliente de
 * `/admin/reembolsos`, que no puede importar el barrel de `checkout`.
 */

/** Mínimo de caracteres: obliga a escribir un motivo, no un «ok». */
export const REFUND_DISMISS_REASON_MIN_LENGTH = 5;

/** Máximo de caracteres: es una nota de auditoría, no un informe. */
export const REFUND_DISMISS_REASON_MAX_LENGTH = 500;
