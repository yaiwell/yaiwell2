/**
 * Fecha corta «día y mes» con los dos dígitos siempre (`10/02`, `10.02.`).
 *
 * `Intl` con `'2-digit'` no rellena el mes en algunos idiomas (en
 * castellano sale `10/2`), y los avisos de bloqueo («hasta el dd/mm»)
 * quedan más claros con el formato fijo. Se respeta el separador de cada
 * idioma. Sin dependencias de servidor: la usan la web y los correos.
 *
 * @param date — instante a formatear.
 * @param intlLocale — locale de `Intl` (p. ej. `es-ES`).
 * @param timeZone — zona horaria del negocio.
 */
export function formatShortDayMonth(date: Date, intlLocale: string, timeZone: string): string {
  const parts = new Intl.DateTimeFormat(intlLocale, {
    day: '2-digit',
    month: '2-digit',
    timeZone,
  }).formatToParts(date);
  return parts
    .map((part) =>
      part.type === 'day' || part.type === 'month' ? part.value.padStart(2, '0') : part.value,
    )
    .join('');
}
