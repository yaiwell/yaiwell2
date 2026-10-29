/**
 * Constantes de los límites de servicios por plan, compartidas entre
 * servidor y cliente (el contador del panel decide si pinta «Ilimitados»).
 */

/**
 * A partir de este `Plan.maxServices` el plan se trata como ilimitado.
 * Premium se siembra con 999: en la práctica ningún negocio llega, y
 * guardarlo como número evita un caso especial `null` en la BD.
 */
export const UNLIMITED_SERVICES_THRESHOLD = 999;

/** Indica si un `maxServices` equivale a «servicios ilimitados». */
export function isUnlimitedServices(maxServices: number): boolean {
  return maxServices >= UNLIMITED_SERVICES_THRESHOLD;
}
