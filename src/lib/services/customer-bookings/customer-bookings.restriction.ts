import 'server-only';

import { getClientOnsiteEligibility } from '@/lib/services/sanctions';

/**
 * Hasta cuándo el cliente solo puede reservar pagando online (§4.bis:
 * 3 sanciones en 12 meses → 3 meses solo online), para el aviso de
 * `/mis-reservas`. Se calcula, no se guarda (`computeOnlineOnlyUntil`).
 *
 * @param clientId — `User.id` del cliente autenticado.
 * @param now — reloj del servidor; el mismo que reparte las secciones.
 * @returns fin del bloqueo, o `null` si no hay bloqueo vigente.
 */
export async function getOnlineOnlyUntil(
  clientId: string,
  now: Date = new Date(),
): Promise<Date | null> {
  const eligibility = await getClientOnsiteEligibility(clientId, now);
  return eligibility.restrictedUntil;
}
