/**
 * Tipos del formulario de profesional (alta y edición).
 */
import type {
  BlockingBookingDto,
  TeamActionErrorCode,
} from '@/app/[locale]/panel/equipo/actions.errors';
import type { WeeklySchedule } from '@/lib/services/availability';
import type { TeamMemberStatus, TeamServiceOption } from '@/lib/services/team';
import type { LocalizedText } from '@/types/domain';

export type SupportedLocale = 'es' | 'ca' | 'en' | 'de' | 'fr';

/** Profesional existente (modo edición). */
export interface ProfessionalFormInitial {
  id: string;
  name: string;
  bio: string | null;
  photo: string | null;
  schedule: WeeklySchedule;
  serviceIds: string[];
  status: TeamMemberStatus;
}

export interface ProfessionalFormProps {
  locale: SupportedLocale;
  /** Negocio de la sesión: dueño de la carpeta de fotos en Storage. */
  providerId: string;
  /** Servicios del negocio para «Servicios que presta». */
  services: TeamServiceOption[];
  /** Sin él, modo alta. */
  professional?: ProfessionalFormInitial;
  /** Horario con el que arranca un alta (el del negocio). */
  defaultSchedule: WeeklySchedule;
  /** Citas futuras que impedirían la baja (edición). */
  blockingBookings?: BlockingBookingDto[];
}

/** Borrador editable del formulario. */
export interface ProfessionalDraft {
  name: string;
  bio: string;
  photo: string | null;
  schedule: WeeklySchedule;
  serviceIds: string[];
}

/** Aviso tras guardar o tras una acción de baja/reactivación. */
export type ProfessionalNotice =
  | { kind: 'saved' }
  | {
      kind: 'error';
      code: TeamActionErrorCode;
      services?: { id: string; name: LocalizedText }[];
    };
