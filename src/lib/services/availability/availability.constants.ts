/**
 * Constantes del dominio `availability`.
 *
 * Viven en su propio archivo (y no en el service) porque las consumen
 * tanto el cálculo puro como el service y los tests. Tener una fuente
 * única evita que los umbrales se dupliquen y se desincronicen, que es
 * exactamente lo que pasó con la implementación fake de Fase 0.
 */

import { MIN_BOOKING_LEAD_TIME_MS } from '@/lib/utils/booking-lead-time';

/**
 * Zona horaria de negocio. Todos los `HH:mm` de `Professional.schedule`
 * se interpretan en esta zona, no en UTC.
 *
 * Vive aquí (y no en el motor puro `availability.calc`) para que los
 * tests del motor sigan operando en UTC literal sin acoplarse a la
 * decisión de país.
 */
export const BUSINESS_TIMEZONE = 'Europe/Madrid';

/**
 * Margen (en minutos) del verde por encima de la antelación mínima.
 * Un hueco que empieza en los primeros 15 minutos reservables es "libre
 * ahora": lo antes que se puede reservar, con un pequeño colchón.
 */
const AVAILABLE_NOW_MARGIN_MINUTES = 15;

/**
 * Umbral del estado `available_now` (pin verde), en minutos desde ahora.
 *
 * VISION.md §"Promesa 1" define el verde como "libre ahora". Ningún
 * hueco que empiece antes de la antelación mínima de reserva (30 min,
 * `MIN_BOOKING_LEAD_TIME_MS`) es comprable, así que el estado solo
 * considera huecos reservables y el verde cubre [30, 45] minutos: el
 * primer tramo que de verdad se puede reservar. Antes era ≤ 15 min, una
 * ventana que, con la antelación mínima, solo anunciaba huecos que
 * `createBooking` rechazaba.
 *
 * OJO: la implementación fake de Fase 0 estiraba el verde hasta 75 min
 * (`src/lib/fake-data/availability.ts`), lo que vaciaba de significado
 * el pin verde. Ese comportamiento queda deliberadamente derogado.
 */
export const AVAILABLE_NOW_WINDOW_MINUTES =
  MIN_BOOKING_LEAD_TIME_MS / 60_000 + AVAILABLE_NOW_MARGIN_MINUTES;

/**
 * Umbral del estado `available_soon` (pin ámbar): hueco que empieza
 * dentro de la próxima hora.
 *
 * Lo fija VISION.md §"Las 5 features del MVP" — «ámbar (libre en menos
 * de 1h)». El fake de Fase 0 usaba 90-180 min, incompatible con el copy
 * "En {minutes} min" del badge: "En 170 min" no comunica nada útil.
 *
 * Junto con la antelación mínima, el filtro "Disponible ahora" (verde o
 * ámbar) equivale a un hueco reservable en [now + 30, now + 60] min.
 */
export const AVAILABLE_SOON_WINDOW_MINUTES = 60;

/**
 * Granularidad de redondeo del instante "ahora" al calcular
 * disponibilidad para el listado.
 *
 * Redondear hacia abajo a bloques de 5 min hace el render determinista
 * dentro de la ventana (dos peticiones seguidas devuelven lo mismo) y
 * deja la puerta abierta a cachear la respuesta. El precio es que un
 * hueco recién ocupado puede tardar hasta 5 min en desaparecer del
 * listado; la verdad definitiva sigue estando en el `SlotPicker` de la
 * ficha y en la validación de `createBooking`, que no se relajan.
 */
export const AVAILABILITY_BUCKET_MINUTES = 5;
