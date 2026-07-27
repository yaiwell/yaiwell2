/**
 * Zona horaria de negocio, replicada aquí a propósito.
 *
 * NO se importa de `@/lib/services/availability` porque ese barrel
 * reexporta funciones que tocan Prisma, y este badge se renderiza
 * también dentro del popup del mapa, que es un Client Component:
 * importarlo arrastraría `pg → dns/fs/net/tls` al bundle y rompería
 * el build. Si algún día cambia, hay que cambiarlo en los dos sitios.
 */
const BUSINESS_TIMEZONE = 'Europe/Madrid';

/**
 * Formatea la hora de un slot en horario de negocio ("19:00").
 *
 * Fijamos `timeZone` explícitamente en lugar de dejar que cada entorno
 * use el suyo: si el servidor renderiza en UTC y el navegador del
 * usuario está en otra zona, el texto cambiaría entre SSR e hidratación.
 *
 * @param slotStart — instante de inicio del hueco.
 * @param locale — locale activo, para el formato horario propio de cada idioma.
 */
export function formatSlotTime(slotStart: Date, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: BUSINESS_TIMEZONE,
  }).format(slotStart);
}
