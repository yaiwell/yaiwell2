/**
 * Tipos del dominio de bloqueos puntuales de agenda.
 *
 * Archivo sin dependencias de servidor: la UI del panel puede importar
 * estos tipos sin arrastrar Prisma.
 */
import type { LocalizedText } from '@/types/domain';

/**
 * Entrada de «bloquear un rango» tal como la ve el dueño en su reloj de
 * Madrid. El servidor la convierte a UTC (ver `madridLocalToUtc`).
 */
export interface CreateScheduleBlockInput {
  /** Día de inicio `YYYY-MM-DD` (hora de Madrid). */
  startDateKey: string;
  /** Hora de inicio `HH:mm`, en pasos de 5 minutos. */
  startTime: string;
  /** Día de fin `YYYY-MM-DD` (hora de Madrid). */
  endDateKey: string;
  /** Hora de fin `HH:mm` (o `24:00`), en pasos de 5 minutos. */
  endTime: string;
  /** Motivo privado del negocio, máx. 200 caracteres. */
  reason?: string;
}

/**
 * Contexto de quien opera. Sale siempre de la sesión, nunca del cliente.
 */
export interface ScheduleBlockContext {
  providerId: string;
  /** `User.id` interno del dueño autenticado. */
  userId: string;
  /** Reloj inyectable para tests. */
  now?: Date;
}

/** Reserva activa que impide crear el bloqueo. */
export interface ScheduleBlockConflict {
  bookingId: string;
  startAt: Date;
  clientName: string | null;
  serviceName: LocalizedText;
}

/** Bloqueo activo tal como lo consume el calendario del panel. */
export interface ScheduleBlockSummary {
  id: string;
  professionalId: string;
  startAt: Date;
  endAt: Date;
  reason: string | null;
}

/** Tramo ocupado por un bloqueo, para el motor de disponibilidad. */
export interface ScheduleBlockSpan {
  professionalId: string;
  startAt: Date;
  endAt: Date;
}

/** Códigos opacos que pueden devolver las operaciones de bloqueos. */
export type ScheduleBlockErrorCode =
  | 'INVALID_INPUT'
  | 'END_BEFORE_START'
  | 'IN_PAST'
  | 'TOO_LONG'
  | 'TOO_FAR'
  | 'CONFLICT'
  | 'NOT_FOUND'
  | 'FORBIDDEN'
  | 'INTERNAL';
