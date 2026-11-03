/**
 * Tipos del dominio `team` (equipo de profesionales de un negocio,
 * CLAUDE.md §4.bis «Equipo»).
 */
import type { WeeklySchedule } from '@/lib/services/availability/availability.types';
import type { LocalizedText } from '@/types/domain';

/**
 * Estado de un profesional en el panel:
 *  - `active`: acepta reservas.
 *  - `outOfPlan`: activo pero fuera del cupo del plan (no acepta
 *    reservas nuevas hasta que el negocio mejore el plan).
 *  - `inactive`: dado de baja (`deletedAt`).
 */
export type TeamMemberStatus = 'active' | 'outOfPlan' | 'inactive';

/** Fila del listado del equipo. */
export interface TeamMember {
  id: string;
  name: string;
  photo: string | null;
  status: TeamMemberStatus;
  /** Servicios no borrados que tiene asignados. */
  serviceCount: number;
}

/** Servicio publicado que nadie del equipo puede atender ahora mismo. */
export interface UnstaffedService {
  id: string;
  name: LocalizedText;
}

/** Lo que pinta `/panel/equipo`. */
export interface TeamOverview {
  members: TeamMember[];
  /** Profesionales activos (dentro y fuera del plan). */
  activeCount: number;
  /** `Plan.maxProfessionals`; `null` = sin límite. */
  maxProfessionals: number | null;
  /** Servicios publicados sin ningún profesional que acepte reservas. */
  unstaffedServices: UnstaffedService[];
}

/** Servicio del negocio como opción del formulario de profesional. */
export interface TeamServiceOption {
  id: string;
  name: LocalizedText;
}

/** Ficha de un profesional para el formulario de edición. */
export interface ProfessionalDetail {
  id: string;
  name: string;
  photo: string | null;
  bio: string | null;
  schedule: WeeklySchedule;
  serviceIds: string[];
  status: TeamMemberStatus;
}

/** Cita futura que impide dar de baja a un profesional. */
export interface BlockingBooking {
  id: string;
  startAt: Date;
  serviceName: LocalizedText;
}

/** Datos validados para crear o editar un profesional. */
export interface ProfessionalInput {
  name: string;
  bio: string | null;
  photo: string | null;
  schedule: WeeklySchedule;
  serviceIds: string[];
}
