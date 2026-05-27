/**
 * Constantes del dominio "location".
 *
 * Centralizamos aquí los valores compartidos para que cualquier ajuste
 * (cambiar la duración de la cookie, mover el centro de fallback, etc.)
 * se haga en un único sitio y se propague a todo el sistema.
 */

import type { UserLocation } from './location.types';

/**
 * Centro geográfico de Barcelona, usado como fallback cuando no tenemos
 * la ubicación real del usuario.
 *
 * Coordenadas aproximadas a Plaça de Catalunya, punto equidistante de
 * los barrios donde se concentra la oferta inicial del marketplace.
 */
export const BARCELONA_CENTER: Readonly<Pick<UserLocation, 'lat' | 'lng'>> = Object.freeze({
  lat: 41.3874,
  lng: 2.1686,
});

/** Nombre de la cookie que persiste la `UserLocation` entre visitas. */
export const COOKIE_NAME = 'beauly_user_location';

/**
 * Duración de la cookie en segundos (30 días).
 *
 * Suficiente para que el usuario no tenga que reconceder permiso en cada
 * visita, sin volverse stale. Si la ubicación queda desactualizada el
 * usuario puede pulsar "Actualizar" desde la pill (C2).
 */
export const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

/**
 * Timeout en milisegundos para `navigator.geolocation.getCurrentPosition`.
 *
 * 10 segundos es el balance habitual: tiempo suficiente para que el GPS
 * indoor obtenga fix vía Wi-Fi y suficientemente corto para que el
 * usuario no piense que la app se ha congelado.
 */
export const GEOLOCATION_TIMEOUT_MS = 10_000;

/**
 * Edad máxima aceptada de una posición cacheada por el navegador.
 *
 * 5 minutos: si el navegador ya tiene una posición reciente, la usamos
 * sin volver a pedir al chip GPS (ahorra batería y latencia).
 */
export const GEOLOCATION_MAX_AGE_MS = 5 * 60 * 1000;
