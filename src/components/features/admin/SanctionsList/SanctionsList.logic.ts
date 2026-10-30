import type { SupportSanctionSummary } from '@/lib/services/sanctions';

/**
 * Cliente tal como lo enseña la fila: nombre y email si hay nombre; si
 * no, solo el email (es lo que soporte busca).
 */
export function formatSanctionClient(
  sanction: Pick<SupportSanctionSummary, 'clientName' | 'clientEmail'>,
): string {
  return sanction.clientName
    ? `${sanction.clientName} · ${sanction.clientEmail}`
    : sanction.clientEmail;
}
