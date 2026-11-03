import { prisma } from '@/lib/db/prisma';
// Import directo y no del barrel de `booking`: `booking.service` usa
// `slot-offers`, que usa este módulo; el barrel cerraría un ciclo.
import { activeBookingWhere } from '@/lib/services/booking/booking.hold';
// Ruta directa por lo mismo: el servicio de bloqueos usa este módulo.
import { scheduleBlocksRepository } from '@/lib/services/schedule-blocks/schedule-blocks.repository';

import { availabilityTeamRepository } from './availability.repository.team';

/**
 * Repositorio del dominio `availability`.
 *
 * Frontera única entre la lógica de negocio y Prisma para todo lo
 * relacionado con cálculo de huecos: carga del horario del profesional
 * y de las reservas activas que pueden bloquear slots.
 *
 * Reglas:
 *  - Aquí NO hay reglas de negocio (validación, parseo, ordenación).
 *    Solo lecturas tipadas.
 *  - Los tests del service mockean este módulo (vía `vi.mock` sobre
 *    `@/lib/db/prisma`) para no necesitar BD real.
 *  - Las lecturas de equipo y cupo del plan viven en
 *    `availability.repository.team.ts` y se exponen aquí mismo: los
 *    consumidores siguen usando solo `availabilityRepository`.
 */
export const availabilityRepository = {
  ...availabilityTeamRepository,

  /**
   * Devuelve el horario semanal en crudo y el buffer del profesional.
   *
   * Devolvemos `schedule` como `unknown` porque en BD es `Json` y solo
   * el `service` (que lo pasa por Zod) debería darle forma. Si el
   * profesional no existe (o está soft-deleted), devolvemos `null`.
   */
  async findProfessionalSchedule(
    professionalId: string,
  ): Promise<{ schedule: unknown; bufferMinutes: number } | null> {
    const professional = await prisma.professional.findFirst({
      where: { id: professionalId, deletedAt: null },
      select: { schedule: true, bufferMinutes: true },
    });
    if (!professional) return null;
    return {
      schedule: professional.schedule,
      bufferMinutes: professional.bufferMinutes,
    };
  },

  /**
   * Devuelve las reservas activas (`confirmed`, o `pending` dentro de
   * la ventana de retención de `booking.hold.ts`) de un profesional que
   * pueden bloquear slots dentro del rango dado.
   *
   * Estrategia de overlap: traemos todas las reservas cuyo `startAt`
   * caiga antes del fin del rango y cuyo `endAt` caiga después del
   * inicio; así no perdemos reservas que cruzan medianoche o que
   * empezaron el día anterior.
   *
   * Sólo seleccionamos `startAt`/`endAt` porque el motor de slots no
   * necesita más.
   */
  async findBookingsForDay(
    professionalId: string,
    dayStart: Date,
    dayEnd: Date,
    now: Date = new Date(),
  ): Promise<{ startAt: Date; endAt: Date }[]> {
    return prisma.booking.findMany({
      where: {
        professionalId,
        ...activeBookingWhere(now),
        startAt: { lt: dayEnd },
        endAt: { gt: dayStart },
      },
      select: { startAt: true, endAt: true },
      orderBy: { startAt: 'asc' },
    });
  },

  /**
   * Lectura BATCH de las reservas activas de varios proveedores dentro
   * de un rango. Complemento de `findScheduleBundlesForProviders` para
   * el listado público.
   *
   * Filtramos por `providerId` (y no por `professionalId`) a propósito:
   * así esta consulta NO depende del resultado de la de horarios y
   * ambas pueden lanzarse en paralelo. Se apoya en el índice
   * `[providerId, startAt]` de `bookings`.
   *
   * Mismo criterio de overlap que `findBookingsForDay`: no perdemos
   * reservas que empezaron antes del rango pero siguen ocupando dentro.
   */
  async findBookingsForProviders(
    providerIds: readonly string[],
    from: Date,
    to: Date,
    now: Date = new Date(),
  ): Promise<{ professionalId: string; startAt: Date; endAt: Date }[]> {
    if (providerIds.length === 0) return [];

    return prisma.booking.findMany({
      where: {
        providerId: { in: providerIds as string[] },
        ...activeBookingWhere(now),
        startAt: { lt: to },
        endAt: { gt: from },
      },
      select: { professionalId: true, startAt: true, endAt: true },
      orderBy: { startAt: 'asc' },
    });
  },

  /**
   * Tramos bloqueados (bloqueos de agenda activos) de un profesional
   * que solapan `[from, to)`. Para el motor son una ocupación más, igual
   * que una reserva: se concatenan con ellas antes de trocear huecos.
   */
  async findScheduleBlocksForRange(
    professionalId: string,
    from: Date,
    to: Date,
  ): Promise<{ startAt: Date; endAt: Date }[]> {
    return scheduleBlocksRepository.findSpansForProfessional(professionalId, from, to);
  },

  /**
   * Lectura BATCH de los bloqueos activos de varios proveedores en un
   * rango. Filtra por `providerId`, como `findBookingsForProviders`,
   * para poder lanzarse en paralelo con la de horarios.
   */
  async findScheduleBlocksForProviders(
    providerIds: readonly string[],
    from: Date,
    to: Date,
  ): Promise<{ professionalId: string; startAt: Date; endAt: Date }[]> {
    return scheduleBlocksRepository.findSpansForProviders(providerIds, from, to);
  },
};
