import 'server-only';

import { pickLocalized } from '@/lib/i18n';
import type { LocalizedText } from '@/types/domain';

import { INCIDENT_REFUND_RESUME_GRACE_MS } from './checkout.incident-refund.eligibility';
import { incidentRefundRepository } from './checkout.incident-refund.repository';
import type { UnfinishedIncidentRefund } from './checkout.incident-refund.types';

/**
 * Reembolsos por incidencia a medias, para verlos en /admin/reembolsos sin
 * pegar el id: nadie los ve de otro modo y el dinero del cliente sigue sin
 * devolverse. Usa el mismo margen que la reanudación, para que todo lo listado
 * se pueda completar. La autorización vive en la página.
 *
 * @param now — reloj de referencia; inyectable en tests.
 */
export async function listUnfinishedIncidentRefunds(
  now: Date = new Date(),
): Promise<UnfinishedIncidentRefund[]> {
  const markedBefore = new Date(now.getTime() - INCIDENT_REFUND_RESUME_GRACE_MS);
  const rows = await incidentRefundRepository.findUnfinished(markedBefore);

  return rows.flatMap((row) => {
    // El `where` ya garantiza la marca; el guard estrecha el tipo.
    if (!row.incidentRefundAt) return [];
    return [
      {
        bookingId: row.id,
        providerName: row.provider.businessName,
        serviceName: pickLocalized(row.service.name as unknown as LocalizedText, 'es'),
        priceCents: row.priceCents,
        startAt: row.startAt,
        incidentRefundAt: row.incidentRefundAt,
      },
    ];
  });
}
