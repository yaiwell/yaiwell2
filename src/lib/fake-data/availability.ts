import type { AvailabilityStatus, AvailabilitySlot } from '@/types/domain';

/**
 * Generador determinista de disponibilidad por proveedor.
 *
 * Objetivo: que recargar la página no haga "saltar" los estados.
 * Solución: derivamos un valor pseudo-aleatorio estable a partir
 * del `providerId` (hash trivial → módulo 100). Esto nos da una
 * distribución repartida pero reproducible sin tocar `Math.random`.
 *
 * Distribución objetivo:
 *  - ~40% available_now
 *  - ~30% available_soon
 *  - ~30% busy
 */

/**
 * Hash trivial determinista de un string a un entero [0, 99].
 * No es criptográfico — solo necesitamos algo estable y disperso.
 */
function deterministicBucket(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return hash % 100;
}

/**
 * Calcula el estado de disponibilidad de un proveedor.
 *
 * Mantenemos la regla de distribución dentro de esta función para que
 * cualquier ajuste de balance se haga en un solo sitio.
 *
 * @param providerId — identificador estable del proveedor.
 * @returns estado actual: ahora, pronto u ocupado.
 */
export function getAvailabilityStatus(providerId: string): AvailabilityStatus {
  const bucket = deterministicBucket(providerId);
  if (bucket < 40) return 'available_now';
  if (bucket < 70) return 'available_soon';
  return 'busy';
}

/**
 * Calcula el próximo slot disponible para un proveedor según su estado.
 *
 * - `available_now`: hueco entre +15 y +75 min desde ahora.
 * - `available_soon`: hueco entre +90 min y +3 h desde ahora.
 * - `busy`: sin hueco hoy → devuelve `null`.
 *
 * Los offsets también se derivan del bucket para que cada proveedor
 * tenga un "próximo hueco" ligeramente distinto y la UI no parezca
 * sintética.
 *
 * @param providerId — identificador estable del proveedor.
 * @param now — instante de referencia. Permite testear sin tocar `Date.now`.
 */
export function getNextSlot(providerId: string, now: Date = new Date()): AvailabilitySlot | null {
  const status = getAvailabilityStatus(providerId);
  if (status === 'busy') return null;

  const bucket = deterministicBucket(providerId);

  // Offset en minutos respecto a `now`, dependiente del estado.
  // Distribución dentro de cada banda para evitar que todos los "ahora"
  // muestren exactamente el mismo "en 15 minutos".
  const offsetMinutes =
    status === 'available_now'
      ? 15 + (bucket % 60) // 15..74 min
      : 90 + (bucket % 90); // 90..179 min

  const startAt = new Date(now.getTime() + offsetMinutes * 60_000);

  // Duración estándar de slot mostrado en la card: 60 min.
  // Cuando el usuario entre en el detalle, verá las duraciones reales
  // por servicio. Aquí solo presentamos un hueco genérico.
  const endAt = new Date(startAt.getTime() + 60 * 60_000);

  return { startAt, endAt };
}

/**
 * Minutos hasta el próximo slot disponible (redondeo al alza).
 * Útil para componer el badge "disponible en {minutes} min".
 * Devuelve `null` si no hay hueco.
 */
export function getMinutesUntilNextSlot(providerId: string, now: Date = new Date()): number | null {
  const slot = getNextSlot(providerId, now);
  if (!slot) return null;
  const diffMs = slot.startAt.getTime() - now.getTime();
  return Math.max(0, Math.ceil(diffMs / 60_000));
}
