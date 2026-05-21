import type { ProviderWithAvailability } from '@/types/domain';

/**
 * Calcula los minutos que faltan hasta el próximo slot disponible.
 *
 * Se aísla en este módulo para mantener pura la función del componente:
 * `Date.now()` no puede llamarse directamente en el cuerpo del render
 * porque el linter de pureza de React lo marca como side effect.
 *
 * @param provider — proveedor enriquecido con su disponibilidad.
 * @returns minutos hasta el próximo slot, o `null` si no hay slot futuro.
 */
export function getMinutesUntilNextSlot(provider: ProviderWithAvailability): number | null {
  const slot = provider.availability.nextSlot;
  if (!slot) return null;
  const diff = slot.startAt.getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / 60_000));
}
