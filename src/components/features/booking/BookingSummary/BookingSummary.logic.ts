/**
 * Lógica pura de formato del paso de resumen.
 *
 * Mantenemos los helpers fuera del componente para mantener el JSX
 * presentacional puro y para poder reutilizarlos en otros pasos.
 */

/**
 * Formatea un slot ISO a un string "viernes 22 de mayo, 17:30" según
 * el locale. La fecha larga sirve como ancla visual fuerte en el resumen
 * para que el usuario no dude del día reservado.
 */
export function formatSlotDateLong(iso: string, locale: 'es' | 'ca'): string {
  return new Intl.DateTimeFormat(locale === 'ca' ? 'ca-ES' : 'es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(iso));
}

/**
 * Formatea solo la hora `HH:MM` del slot. Útil para mostrar el rango
 * "17:30 → 18:30" en una sola línea.
 */
export function formatSlotTimeOnly(iso: string, locale: 'es' | 'ca'): string {
  return new Intl.DateTimeFormat(locale === 'ca' ? 'ca-ES' : 'es-ES', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(iso));
}

/**
 * Formatea céntimos como moneda EUR con cero decimales si es exacto,
 * dos si tiene parte fraccionaria. Es el mismo criterio que usa la
 * ficha de servicio (`ProviderServicesList.logic.ts`) para mantener
 * coherencia visual entre vistas.
 */
export function formatPriceCents(cents: number, locale: 'es' | 'ca'): string {
  const hasDecimals = cents % 100 !== 0;
  const intlLocale = locale === 'ca' ? 'ca-ES' : 'es-ES';

  return new Intl.NumberFormat(intlLocale, {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: hasDecimals ? 2 : 0,
    maximumFractionDigits: hasDecimals ? 2 : 0,
  }).format(cents / 100);
}
