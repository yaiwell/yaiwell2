import 'server-only';

import { prisma } from '@/lib/db/prisma';
import type { LocalizedText } from '@/types/domain';

import { selectBookableIds } from './team.bookable';
import {
  LastActiveProfessionalError,
  PlanProfessionalLimitError,
  ProfessionalHasFutureBookingsError,
  ProfessionalNotFoundError,
  ServicesWouldBeUnstaffedError,
} from './team.errors';
import { teamRepository } from './team.repository';
import { findNewlyUnstaffed } from './team.rules';
import { loadTeamSnapshot, published } from './team.snapshot';

/**
 * Baja y reactivación de profesionales (CLAUDE.md §4.bis «Equipo»).
 * La baja es blanda (`deletedAt`): su historial de reservas y reseñas
 * sigue apuntando a él y puede volver con sus servicios.
 */

/**
 * Da de baja a un profesional.
 *
 * Prohibido si:
 *  - tiene citas futuras activas: el negocio debe cancelarlas antes
 *    (regla de 2 h y devolución); reasignarlas es una mejora posterior;
 *  - es el último activo del negocio;
 *  - algún servicio publicado se quedaría sin nadie que lo preste.
 *
 * Darlo de baja libera cupo: si había profesionales fuera de plan, el
 * más antiguo de ellos vuelve a aceptar reservas, y eso cuenta al
 * comprobar los servicios.
 *
 * En la misma transacción se retiran sus ofertas de hueco con descuento
 * aún abiertas: nadie podría reservarlas y no deben seguir anunciándose.
 *
 * Idempotente: dar de baja a quien ya lo está no hace nada.
 *
 * @throws ProfessionalNotFoundError, LastActiveProfessionalError,
 *   ProfessionalHasFutureBookingsError, ServicesWouldBeUnstaffedError.
 */
export async function deactivateProfessional(
  providerId: string,
  professionalId: string,
  now: Date = new Date(),
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const member = await teamRepository.findMember(providerId, professionalId, tx);
    if (!member) throw new ProfessionalNotFoundError();
    if (member.deletedAt) return;

    const snapshot = await loadTeamSnapshot(tx, providerId);
    if (snapshot.activeIds.length <= 1) throw new LastActiveProfessionalError();

    // Mismo cerrojo que la reserva: no se cuela una cita entre la
    // comprobación y la baja.
    await teamRepository.lockProfessionalAgenda(professionalId, tx);
    const future = await teamRepository.findFutureActiveBookings(professionalId, now, tx);
    if (future.length > 0) {
      throw new ProfessionalHasFutureBookingsError(
        future.map((b) => ({
          id: b.id,
          startAt: b.startAt,
          serviceName: b.service.name as unknown as LocalizedText,
        })),
      );
    }

    const services = published(snapshot.services);
    const remaining = snapshot.activeIds.filter((id) => id !== professionalId);
    const unstaffed = findNewlyUnstaffed(
      { services, bookable: snapshot.bookable },
      {
        services: services.map((s) => ({
          ...s,
          professionalIds: s.professionalIds.filter((id) => id !== professionalId),
        })),
        bookable: new Set(selectBookableIds(remaining, snapshot.maxProfessionals)),
      },
    );
    if (unstaffed.length > 0) throw new ServicesWouldBeUnstaffedError(unstaffed);

    await teamRepository.setDeletedAt(professionalId, now, tx);
    await teamRepository.withdrawOpenOffers(professionalId, now, tx);
  });
}

/**
 * Reactiva a un profesional dado de baja, con sus servicios de antes.
 *
 * Idempotente: reactivar a quien ya está activo no hace nada.
 *
 * @throws ProfessionalNotFoundError si no existe o es de otro negocio.
 * @throws PlanProfessionalLimitError si el plan ya está lleno.
 */
export async function reactivateProfessional(
  providerId: string,
  professionalId: string,
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const member = await teamRepository.findMember(providerId, professionalId, tx);
    if (!member) throw new ProfessionalNotFoundError();
    if (!member.deletedAt) return;

    const snapshot = await loadTeamSnapshot(tx, providerId);
    const max = snapshot.maxProfessionals;
    if (max !== null && snapshot.activeIds.length >= max) {
      throw new PlanProfessionalLimitError(max);
    }
    await teamRepository.setDeletedAt(professionalId, null, tx);
  });
}
