/**
 * Constantes del dominio `availability`.
 *
 * Viven en su propio archivo (y no en el service) porque las consumen
 * tanto el cálculo puro como el service y los tests. Tener una fuente
 * única evita que los umbrales se dupliquen y se desincronicen, que es
 * exactamente lo que pasó con la implementación fake de Fase 0.
 */

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
 * Umbral del estado `available_now` (pin verde): un hueco que empieza
 * dentro de los próximos 15 minutos se considera "libre ahora".
 *
 * VISION.md §"Promesa 1" define el verde como "libre ahora". 15 minutos
 * es el margen operativo mínimo para que el cliente reserve y se
 * desplace; por debajo de eso el hueco no es realmente reservable.
 *
 * OJO: la implementación fake de Fase 0 estiraba el verde hasta 75 min
 * (`src/lib/fake-data/availability.ts`), lo que vaciaba de significado
 * el pin verde. Ese comportamiento queda deliberadamente derogado.
 */
export const AVAILABLE_NOW_WINDOW_MINUTES = 15;

/**
 * Umbral del estado `available_soon` (pin ámbar): hueco que empieza
 * dentro de la próxima hora.
 *
 * Lo fija VISION.md §"Las 5 features del MVP" — «ámbar (libre en menos
 * de 1h)». El fake de Fase 0 usaba 90-180 min, incompatible con el copy
 * "En {minutes} min" del badge: "En 170 min" no comunica nada útil.
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
