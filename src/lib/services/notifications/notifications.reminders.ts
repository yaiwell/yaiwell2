import 'server-only';

import { addDaysToDateKey, getMadridDateKey, getMadridDayRange } from '@/lib/utils/madrid-week';

import { notificationsRepository } from './notifications.repository';
import { notifyBookingReminder } from './notifications.service';

/** Tope de recordatorios por ejecución; si se supera, lo vemos en el log. */
const MAX_REMINDERS_PER_RUN = 60;

/**
 * Pausa entre envíos: Resend admite 2 peticiones por segundo por defecto
 * y la propia latencia del envío ya suma margen.
 */
const SEND_PAUSE_MS = 300;

/**
 * Presupuesto de tiempo del barrido. El cron corre con `maxDuration = 60`
 * y comparte la función con la caducidad de `pending`: paramos antes de
 * que Vercel corte a mitad de un envío y lo dejamos marcado como truncado.
 */
const TIME_BUDGET_MS = 40_000;

/** Resumen del barrido para la respuesta del cron. */
export interface ReminderSweepSummary {
  scanned: number;
  sent: number;
  truncated: boolean;
}

/**
 * Envía el recordatorio de las citas confirmadas de **mañana** (día civil
 * de Madrid). Lo llama el cron diario de madrugada, así que cada reserva
 * entra en un único barrido; la clave de idempotencia cubre además un
 * posible reintento del cron el mismo día.
 *
 * Limitación conocida (un solo cron al día en Hobby): una cita reservada
 * después del barrido para el día siguiente no recibe recordatorio, y lo
 * que quede fuera por tope o por tiempo tampoco se recupera.
 *
 * Nunca lanza por un envío: `notifyBookingReminder` se traga sus fallos.
 * Sí lanza si falla la consulta inicial (BD caída).
 *
 * @param now — momento de referencia; inyectable en tests.
 * @param pauseMs — pausa entre envíos; 0 en tests.
 * @param budgetMs — tiempo máximo del bucle de envíos.
 */
export async function sendTomorrowReminders(
  now: Date = new Date(),
  pauseMs: number = SEND_PAUSE_MS,
  budgetMs: number = TIME_BUDGET_MS,
): Promise<ReminderSweepSummary> {
  const startedAt = Date.now();
  const tomorrow = addDaysToDateKey(getMadridDateKey(now), 1);
  const { start, end } = getMadridDayRange(tomorrow);
  const ids = await notificationsRepository.findConfirmedBookingIdsStartingBetween(start, end);

  const batch = ids.slice(0, MAX_REMINDERS_PER_RUN);
  let sent = 0;
  for (const id of batch) {
    if (Date.now() - startedAt > budgetMs) break;
    if (sent > 0) await pause(pauseMs);
    await notifyBookingReminder(id);
    sent++;
  }
  const truncated = sent < ids.length;
  if (truncated) console.warn(`[notifications] reminders truncated: ${sent} of ${ids.length}`);
  return { scanned: ids.length, sent, truncated };
}

/** Espera entre envíos para no chocar con el límite de Resend. */
function pause(ms: number): Promise<void> {
  if (ms <= 0) return Promise.resolve();
  return new Promise((resolve) => setTimeout(resolve, ms));
}
