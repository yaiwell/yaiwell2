/**
 * API pública del dominio `team` (equipo de profesionales del negocio).
 *
 * Solo servidor: reexporta servicios con Prisma. Los Client Components
 * importan de aquí únicamente TIPOS (`import type`), que se borran al
 * compilar y no arrastran nada al bundle.
 */
export { createProfessional, updateProfessional } from './team.service';
export { deactivateProfessional, reactivateProfessional } from './team.lifecycle';
export {
  EMPTY_WEEKLY_SCHEDULE,
  getProfessionalDetail,
  getTeamOverview,
  listBlockingBookings,
  listActiveProfessionalOptions,
  listTeamServiceOptions,
} from './team.queries';
export { getBookableProfessionalIds, selectBookableIds } from './team.bookable';
export { teamRepository } from './team.repository';
export {
  LastActiveProfessionalError,
  PlanProfessionalLimitError,
  ProfessionalHasFutureBookingsError,
  ProfessionalInactiveError,
  ProfessionalNotFoundError,
  ProfessionalPhotoInvalidError,
  ServicesWouldBeUnstaffedError,
  TeamProviderNotFoundError,
  TeamServicesInvalidError,
} from './team.errors';
export {
  PROFESSIONAL_BIO_MAX,
  PROFESSIONAL_NAME_MAX,
  professionalInputSchema,
  teamIdSchema,
  type ProfessionalInputParsed,
} from './team.validation';
export type {
  BlockingBooking,
  ProfessionalDetail,
  ProfessionalInput,
  TeamMember,
  TeamMemberStatus,
  TeamOverview,
  TeamServiceOption,
  UnstaffedService,
} from './team.types';
