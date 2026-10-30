/**
 * Cálculo puro del bloqueo por sanciones (CLAUDE.md §4.bis).
 *
 * Regla: **3 sanciones en los últimos 12 meses** → durante los **3 meses**
 * siguientes a la tercera, el cliente solo puede reservar pagando online.
 * Las sanciones revocadas no cuentan; las de más de 12 meses dejan de
 * contar para disparar un bloqueo nuevo.
 *
 * El bloqueo no se guarda en BD: se recalcula siempre desde las sanciones,
 * así revocar una (soporte o «deshacer» del negocio) lo corrige solo.
 *
 * Sin dependencias de BD: se prueba en aislamiento y lo puede reutilizar
 * cualquier capa.
 */

/** Sanciones dentro de la ventana que disparan el bloqueo. */
export const SANCTIONS_THRESHOLD = 3;

/** Ventana, en meses naturales, en la que se cuentan las sanciones. */
export const SANCTION_WINDOW_MONTHS = 12;

/** Duración, en meses naturales, del bloqueo «solo online». */
export const ONLINE_ONLY_MONTHS = 3;

/**
 * Antigüedad máxima (en meses) de una sanción que aún puede influir en un
 * bloqueo vigente: la más antigua de un trío dista como mucho 12 meses de
 * la tercera, y el bloqueo dura 3 meses desde esta. El repositorio no
 * necesita leer nada anterior.
 */
export const SANCTION_LOOKBACK_MONTHS = SANCTION_WINDOW_MONTHS + ONLINE_ONLY_MONTHS;

/** Lo mínimo de una sanción que necesita el cálculo. */
export interface SanctionForCalc {
  occurredAt: Date;
  revokedAt: Date | null;
}

/**
 * Suma meses naturales en UTC, ajustando al último día del mes si el día
 * no existe (31 de enero + 1 mes = 28/29 de febrero).
 *
 * Meses naturales y no «30 días» porque así se explica al cliente («hasta
 * el 15 de marzo»). UTC para que el resultado no dependa del servidor.
 */
export function addMonthsUtc(date: Date, months: number): Date {
  const result = new Date(date.getTime());
  const day = result.getUTCDate();
  result.setUTCDate(1);
  result.setUTCMonth(result.getUTCMonth() + months);
  const lastDay = new Date(
    Date.UTC(result.getUTCFullYear(), result.getUTCMonth() + 1, 0),
  ).getUTCDate();
  result.setUTCDate(Math.min(day, lastDay));
  return result;
}

/** Sanciones vigentes (no revocadas) ordenadas de más antigua a más reciente. */
function activeSorted(sanctions: readonly SanctionForCalc[]): Date[] {
  return sanctions
    .filter((s) => s.revokedAt === null)
    .map((s) => s.occurredAt)
    .sort((a, b) => a.getTime() - b.getTime());
}

/**
 * Hasta cuándo el cliente solo puede pagar online, o `null` si no hay
 * bloqueo vigente en `now`.
 *
 * Para cada sanción i (desde la tercera, ordenadas), si entre ella y la
 * sanción i−2 hay 12 meses o menos, hay tres en una ventana de 12 meses
 * y se bloquea hasta `s[i] + 3 meses`. Se queda el bloqueo más lejano:
 * una cuarta sanción durante un bloqueo lo prolonga.
 *
 * El límite `now` es exclusivo: en el instante exacto en que vence el
 * bloqueo, el cliente ya puede volver a pagar en el local.
 *
 * @param sanctions — sanciones del cliente (revocadas incluidas o no).
 * @param now — instante de referencia.
 */
export function computeOnlineOnlyUntil(
  sanctions: readonly SanctionForCalc[],
  now: Date,
): Date | null {
  const dates = activeSorted(sanctions);
  let blockedUntil: Date | null = null;
  for (let i = SANCTIONS_THRESHOLD - 1; i < dates.length; i++) {
    const first = dates[i - (SANCTIONS_THRESHOLD - 1)];
    const current = dates[i];
    if (current.getTime() > addMonthsUtc(first, SANCTION_WINDOW_MONTHS).getTime()) continue;
    const until = addMonthsUtc(current, ONLINE_ONLY_MONTHS);
    if (!blockedUntil || until.getTime() > blockedUntil.getTime()) blockedUntil = until;
  }
  if (!blockedUntil || blockedUntil.getTime() <= now.getTime()) return null;
  return blockedUntil;
}

/**
 * Cuántas sanciones vigentes caen en los últimos 12 meses (límite
 * incluido). Es el «n de 3» que se le cuenta al cliente en el aviso.
 *
 * @param sanctions — sanciones del cliente.
 * @param now — instante de referencia.
 */
export function countSanctionsInWindow(sanctions: readonly SanctionForCalc[], now: Date): number {
  const since = addMonthsUtc(now, -SANCTION_WINDOW_MONTHS).getTime();
  return activeSorted(sanctions).filter((d) => d.getTime() >= since && d.getTime() <= now.getTime())
    .length;
}
