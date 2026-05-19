import type { ProviderWithAvailability } from '@/types/domain';

/**
 * Formatea un precio en céntimos a "32 €" / "1.250 €".
 *
 * Usamos `Intl.NumberFormat` en lugar de manipular strings para que
 * el separador de miles respete el locale del usuario.
 */
export function formatPriceCents(cents: number, locale: string): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

/**
 * Calcula los minutos hasta el próximo slot del proveedor, mirando
 * `availability.nextSlot`. Devuelve `null` si no hay slot (busy).
 */
export function getMinutesUntilNextSlot(provider: ProviderWithAvailability): number | null {
  const slot = provider.availability.nextSlot;
  if (!slot) return null;
  const diff = slot.startAt.getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / 60_000));
}
