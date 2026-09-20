import { hasLocale } from 'next-intl';
import { getRequestConfig } from 'next-intl/server';

import { routing } from './routing';

/**
 * Configuración de i18n por petición.
 *
 * El plugin de next-intl (registrado en `next.config.ts`) carga este archivo
 * para resolver el locale activo y sus mensajes en cada render del servidor.
 *
 * Validamos el `requestLocale` con `hasLocale` para que cualquier valor
 * inesperado caiga al locale por defecto en lugar de propagar `undefined`
 * o un string arbitrario.
 */
export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested) ? requested : routing.defaultLocale;

  // Carga perezosa de los mensajes para que cada locale viaje solo cuando
  // se renderiza ese idioma. Tipamos la importación como `default` JSON.
  const messages = (await import(`../messages/${locale}.json`)).default;

  return {
    locale,
    messages,
    // Timezone fija del negocio. Sin ella, next-intl formatea fechas en
    // la zona del entorno: UTC en el render de servidor (Vercel) y la
    // del navegador en el cliente. Eso provoca (a) mismatch de
    // hidratación y (b) que un usuario español vea sus reservas una o
    // dos horas antes de la hora real. Yaiwell opera en España, así que
    // fijamos `Europe/Madrid` como hacen ya el panel del proveedor
    // (`PANEL_TZ`) y el motor de disponibilidad.
    timeZone: 'Europe/Madrid',
  };
});
