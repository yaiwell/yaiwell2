import { prisma } from '@/lib/db/prisma';

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
 */
export const availabilityRepository = {
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
   * Devuelve las reservas activas (`pending` o `confirmed`) de un
   * profesional que pueden bloquear slots dentro del rango dado.
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
  ): Promise<{ startAt: Date; endAt: Date }[]> {
    return prisma.booking.findMany({
      where: {
        professionalId,
        status: { in: ['pending', 'confirmed'] },
        startAt: { lt: dayEnd },
        endAt: { gt: dayStart },
      },
      select: { startAt: true, endAt: true },
      orderBy: { startAt: 'asc' },
    });
  },

  /**
   * Resuelve los datos mínimos de un Service necesarios para calcular
   * disponibilidad: providerId, professionalId (puede ser null en el
   * catálogo histórico) y duración. Filtra `isActive` y `deletedAt`
   * para que servicios pausados o borrados no ofrezcan slots.
   */
  async findServiceForAvailability(serviceId: string): Promise<{
    id: string;
    providerId: string;
    professionalId: string | null;
    durationMinutes: number;
  } | null> {
    return prisma.service.findFirst({
      where: { id: serviceId, deletedAt: null, isActive: true },
      select: {
        id: true,
        providerId: true,
        professionalId: true,
        durationMinutes: true,
      },
    });
  },

  /**
   * Devuelve el `id` del primer Professional activo del provider,
   * ordenado por `createdAt asc`. Usado como fallback cuando el
   * `Service.professionalId` viene null (catálogo Fase 0 — todos los
   * services del wizard se crean con `null` y la disponibilidad se
   * deriva del único professional del autónomo).
   */
  async findFirstProfessionalIdForProvider(providerId: string): Promise<string | null> {
    const row = await prisma.professional.findFirst({
      where: { providerId, deletedAt: null },
      orderBy: { createdAt: 'asc' },
      select: { id: true },
    });
    return row?.id ?? null;
  },
};
