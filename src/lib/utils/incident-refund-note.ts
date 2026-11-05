/**
 * Límites del motivo de un reembolso por incidencia del centro.
 *
 * Viven en `utils` (sin dependencias de servidor) porque los comparten el
 * schema Zod del dominio `checkout` y el formulario cliente de
 * `/admin/reembolsos`, que no puede importar el barrel de `checkout`.
 */

/** Mínimo de caracteres: obliga a explicar la incidencia, no un «ok». */
export const INCIDENT_REFUND_NOTE_MIN_LENGTH = 10;

/** Máximo de caracteres: Stripe no admite más en un valor de `metadata`. */
export const INCIDENT_REFUND_NOTE_MAX_LENGTH = 500;
