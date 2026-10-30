/**
 * API pública del módulo `sanctions` (sanciones por no presentado en
 * reservas con pago en el local, CLAUDE.md §4.bis).
 *
 * NO client-safe: el servicio y el repositorio importan Prisma. Un Client
 * Component solo puede importar de aquí con `import type`.
 */

export {
  SUPPORT_SANCTIONS_LIMIT,
  getClientOnsiteEligibility,
  listActiveSanctions,
  listActiveSanctionsForSupport,
  revokeSanction,
} from './sanctions.service';
export { sanctionsRepository } from './sanctions.repository';
export type { NoShowSanctionData, SanctionRevocation } from './sanctions.repository';

export {
  ONLINE_ONLY_MONTHS,
  SANCTIONS_THRESHOLD,
  SANCTION_WINDOW_MONTHS,
  addMonthsUtc,
  computeOnlineOnlyUntil,
  countSanctionsInWindow,
} from './sanctions.calc';
export type { SanctionForCalc } from './sanctions.calc';

export { SanctionAlreadyRevokedError, SanctionNotFoundError } from './sanctions.errors';
export { revokeSanctionSchema, supportSanctionsFilterSchema } from './sanctions.validation';
export type { RevokeSanctionParsed } from './sanctions.validation';

export type {
  ActiveSanctionSummary,
  ClientOnsiteEligibility,
  RevokeSanctionResult,
  SanctionReason,
  SupportSanctionSummary,
} from './sanctions.types';
