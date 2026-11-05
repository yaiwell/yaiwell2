/**
 * Auditoría del reembolso por incidencia en la `metadata` del Refund de
 * Stripe. Sale siempre de las mismas columnas, para que el primer intento, la
 * reanudación y el reintento de la cola digan lo mismo.
 */

/** Columnas de auditoría de la reserva (migración 9k). */
export interface IncidentAuditColumns {
  incidentRefundAt?: Date | null;
  incidentRefundBy?: string | null;
  incidentRefundNote?: string | null;
}

/**
 * `metadata` de una reserva con reembolso por incidencia; `undefined` en las
 * demás, de modo que los caminos automáticos no cambian sus parámetros.
 */
export function incidentMetadataFromColumns(
  columns: IncidentAuditColumns,
): Record<string, string> | undefined {
  if (!columns.incidentRefundAt) return undefined;
  return {
    reason: 'centre_incident',
    ...(columns.incidentRefundNote ? { note: columns.incidentRefundNote } : {}),
    ...(columns.incidentRefundBy ? { adminUserId: columns.incidentRefundBy } : {}),
  };
}
