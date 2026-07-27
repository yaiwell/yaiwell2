/**
 * Helpers de tiempo civil para el cálculo de disponibilidad.
 *
 * ¿Por qué existe este archivo? Porque el motor puro (`availability.calc`)
 * indexa el horario semanal con `date.getUTCDay()` e interpreta los
 * `HH:mm` del schedule como hora local de Madrid. Eso obliga a que la
 * fecha que se le pasa sea la medianoche **UTC** del día **civil de
 * Madrid**, no un `new Date()` cualquiera.
 *
 * Si se le pasa `new Date()` directamente, entre las 00:00 y las 02:00
 * de Madrid `getUTCDay()` devuelve el día ANTERIOR y se aplica el
 * horario del día equivocado. Es el mismo fallo que corrigió el commit
 * 2bd098e en otro punto de entrada; centralizarlo aquí evita que
 * reaparezca cada vez que alguien enchufa un consumidor nuevo.
 */

/**
 * Devuelve la medianoche UTC que representa el día civil de `instant`
 * en la zona horaria dada.
 *
 * Es un "marcador de fecha": `2026-07-27T00:00:00Z` significa "el día
 * 27 de julio en Madrid", no un instante real de la línea temporal. El
 * motor de slots lo usa solo para saber qué día de la semana es y sobre
 * qué fecha construir las horas de apertura.
 *
 * @param instant — momento real a situar.
 * @param timezone — zona IANA (ej. `'Europe/Madrid'`).
 */
export function getCivilDayUtc(instant: Date, timezone: string): Date {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(instant);

  const year = parts.find((p) => p.type === 'year')?.value ?? '1970';
  const month = parts.find((p) => p.type === 'month')?.value ?? '01';
  const day = parts.find((p) => p.type === 'day')?.value ?? '01';

  return new Date(`${year}-${month}-${day}T00:00:00.000Z`);
}

/**
 * Devuelve los marcadores de día civil que abarca la ventana
 * `[from, to]` en la zona horaria dada.
 *
 * Normalmente devuelve un único día, pero cuando la ventana cruza la
 * medianoche de Madrid (ej. consultar a las 23:45 con ventana de 1h)
 * devuelve dos. Sin esto perderíamos los huecos de primera hora del día
 * siguiente y todo saldría gris de madrugada.
 *
 * Acotado a 3 días como red de seguridad: las ventanas de este dominio
 * son de minutos, así que más de 2 indicaría un bug en el caller.
 */
export function getCivilDaysInWindow(from: Date, to: Date, timezone: string): Date[] {
  const first = getCivilDayUtc(from, timezone);
  const last = getCivilDayUtc(to, timezone);

  const days: Date[] = [first];
  const DAY_MS = 24 * 60 * 60 * 1000;
  // Los marcadores son fechas puras, así que sumar 24h siempre avanza
  // exactamente un día civil (el DST no les afecta: no son instantes).
  let cursor = first.getTime();
  while (cursor < last.getTime() && days.length < 3) {
    cursor += DAY_MS;
    days.push(new Date(cursor));
  }

  return days;
}

/**
 * Redondea un instante hacia abajo al bloque de `minutes` más cercano.
 *
 * Se usa para estabilizar el "ahora" con el que se calcula el listado:
 * dentro del mismo bloque, dos renders devuelven exactamente el mismo
 * resultado. Idempotente por construcción.
 */
export function floorToBucket(instant: Date, minutes: number): Date {
  if (minutes <= 0) return new Date(instant.getTime());
  const bucketMs = minutes * 60_000;
  return new Date(Math.floor(instant.getTime() / bucketMs) * bucketMs);
}
