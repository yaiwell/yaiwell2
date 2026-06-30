/**
 * API pública del módulo `verification`.
 *
 * Este barrel **NO es client-safe**: el service importa Prisma. Si un
 * Client Component necesita tipos, importarlos desde aquí está OK
 * (los `type` no llegan al bundle) pero NO importar las funciones —
 * todos los callers actuales son server (page del admin + server
 * actions). El `'server-only'` en service+repository protege con un
 * fallo claro si alguien lo importa accidentalmente desde un Client.
 */

export {
  approveProvider,
  countProvidersByVerificationStatus,
  getVerificationDetail,
  listPendingVerifications,
  rejectProvider,
} from './verification.service';

export {
  InvalidVerificationStatusError,
  ProviderNotFoundForVerificationError,
  RejectionNotesRequiredError,
} from './verification.errors';

export type {
  AdminVerificationRequest,
  VerificationDocument,
  VerificationDocumentType,
  VerificationStatus,
} from './verification.types';
