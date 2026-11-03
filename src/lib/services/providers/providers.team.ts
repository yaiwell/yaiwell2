import 'server-only';

import type { Prisma } from '@prisma/client';

import { prisma } from '@/lib/db/prisma';
// Ruta directa: el barrel de `team` arrastra servicios con
// `provider-onboarding` y no hace falta aquí.
import { getBookableProfessionalIds } from '@/lib/services/team/team.bookable';
import type { PublicProfessional } from '@/types/domain';

import { mapPublicProfessional } from './providers.mapper';

/**
 * Lecturas públicas del equipo de un negocio (CLAUDE.md §4.bis
 * «Equipo», decidido 2026-11-03).
 *
 * Van aparte de `providers.repository.ts` para que este no pase de las
 * ~250 líneas. Mismo criterio de visibilidad en todas que el motor de
 * disponibilidad: solo profesionales activos **dentro del cupo del plan**
 * (los N más antiguos, `getBookableProfessionalIds`) y solo los campos
 * que el negocio publica (nombre, foto y bio). Quien está fuera de plan
 * no ofrece huecos y el servidor lo rechaza al reservar: enseñarlo en la
 * ficha o en el selector de profesional solo llevaría a un error.
 */

/**
 * Ids del equipo que hoy acepta reservas. Una lectura por página (plan
 * y activos, en paralelo), que se cruza en memoria con las filas de
 * servicios y profesionales: sin N+1.
 */
export async function findBookableProfessionalIdSet(providerId: string): Promise<Set<string>> {
  return new Set(await getBookableProfessionalIds(providerId));
}

/**
 * Selección Prisma de los profesionales que prestan un servicio, lista
 * para anidarse dentro del `select` de `service`. La comparten la ficha
 * del centro y la página de servicio para que ambas enseñen al mismo
 * equipo que el motor de disponibilidad: mismo filtro (`deletedAt`) y
 * mismo orden (antigüedad, desempate por id) que
 * `availabilityRepository.findServiceForAvailability`.
 *
 * Prisma resuelve la relación anidada con una consulta por nivel para
 * todo el lote de servicios, no una por servicio: sin N+1.
 */
export const SERVICE_PROFESSIONALS_SELECT = {
  where: { professional: { deletedAt: null } },
  orderBy: [{ professional: { createdAt: 'asc' } }, { professionalId: 'asc' }],
  select: { professional: { select: { id: true, name: true, photo: true, bio: true } } },
} satisfies Prisma.Service$professionalsArgs;

/** Fila de `service_professionals` tal y como la devuelve la selección anterior. */
export interface ServiceProfessionalLinkRow {
  professional: { id: string; name: string; photo: string | null; bio: string | null };
}

/**
 * Convierte los enlaces de un servicio en la lista pública de
 * profesionales, dejando fuera a quien no entra en el cupo del plan.
 *
 * @param bookable — ids reservables (`findBookableProfessionalIdSet`).
 */
export function mapServiceProfessionalLinks(
  links: readonly ServiceProfessionalLinkRow[],
  bookable: ReadonlySet<string>,
): PublicProfessional[] {
  return links
    .filter((link) => bookable.has(link.professional.id))
    .map((link) => mapPublicProfessional(link.professional));
}

/**
 * Equipo público de un negocio: profesionales activos y dentro del cupo
 * del plan que prestan al menos un servicio publicado (activo y no
 * borrado), por antigüedad.
 *
 * Quien no presta nada reservable no sale en la ficha: no se le puede
 * elegir y anunciarlo confundiría al cliente.
 *
 * @param providerId — negocio ya validado como público por el caller.
 */
export async function findPublicTeamByProvider(providerId: string): Promise<PublicProfessional[]> {
  const [rows, bookable] = await Promise.all([
    prisma.professional.findMany({
      where: {
        providerId,
        deletedAt: null,
        serviceLinks: { some: { service: { deletedAt: null, isActive: true } } },
      },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      select: { id: true, name: true, photo: true, bio: true },
    }),
    findBookableProfessionalIdSet(providerId),
  ]);
  return rows.filter((row) => bookable.has(row.id)).map(mapPublicProfessional);
}

/**
 * Profesional que atiende una reserva del cliente indicado, para la
 * confirmación («quién te atenderá»). Con «cualquiera disponible» es el
 * que asignó el servidor al crear la reserva.
 *
 * Filtra por `clientId`: el `bookingId` viaja en la URL de retorno de
 * Stripe y cualquiera podría probar ids ajenos. Devuelve `null` tanto si
 * la reserva no existe como si es de otro cliente.
 *
 * @param bookingId — reserva a consultar.
 * @param clientUserId — `User.id` del cliente autenticado.
 */
export async function findBookedProfessional(
  bookingId: string,
  clientUserId: string,
): Promise<PublicProfessional | null> {
  const row = await prisma.booking.findFirst({
    where: { id: bookingId, clientId: clientUserId },
    select: { professional: { select: { id: true, name: true, photo: true, bio: true } } },
  });
  return row ? mapPublicProfessional(row.professional) : null;
}
