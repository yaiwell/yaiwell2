/**
 * Reglas puras del equipo: estado de cada profesional y qué servicios se
 * quedarían sin nadie tras un cambio. Sin BD, para poder probarlas solas.
 */
import type { LocalizedText } from '@/types/domain';

import type { TeamMemberStatus, UnstaffedService } from './team.types';

/** Servicio publicado con los profesionales activos que lo prestan. */
export interface ServiceStaff {
  id: string;
  name: LocalizedText;
  professionalIds: readonly string[];
}

/**
 * Estado de un profesional en el panel.
 *
 * @param isActive — sin `deletedAt`.
 * @param bookable — ids dentro del cupo del plan.
 */
export function memberStatus(
  id: string,
  isActive: boolean,
  bookable: ReadonlySet<string>,
): TeamMemberStatus {
  if (!isActive) return 'inactive';
  return bookable.has(id) ? 'active' : 'outOfPlan';
}

/** Servicios que nadie dentro del cupo puede atender. */
export function findUnstaffed(
  services: readonly ServiceStaff[],
  bookable: ReadonlySet<string>,
): UnstaffedService[] {
  return services
    .filter((s) => !s.professionalIds.some((id) => bookable.has(id)))
    .map((s) => ({ id: s.id, name: s.name }));
}

/**
 * Servicios que hoy se pueden reservar y dejarían de poder tras el
 * cambio. Los que ya estaban sin nadie no cuentan: no los rompe este
 * cambio y el panel ya los avisa aparte.
 *
 * @param before — personal y cupo antes del cambio.
 * @param after — personal y cupo después del cambio.
 */
export function findNewlyUnstaffed(
  before: { services: readonly ServiceStaff[]; bookable: ReadonlySet<string> },
  after: { services: readonly ServiceStaff[]; bookable: ReadonlySet<string> },
): UnstaffedService[] {
  const wasStaffed = new Set(
    before.services
      .filter((s) => s.professionalIds.some((id) => before.bookable.has(id)))
      .map((s) => s.id),
  );
  return findUnstaffed(after.services, after.bookable).filter((s) => wasStaffed.has(s.id));
}

/**
 * Copia de `services` como quedaría si el profesional prestara solo
 * `serviceIds` (lo añade o lo quita de cada servicio).
 */
export function withAssignment(
  services: readonly ServiceStaff[],
  professionalId: string,
  serviceIds: ReadonlySet<string>,
): ServiceStaff[] {
  return services.map((s) => {
    const others = s.professionalIds.filter((id) => id !== professionalId);
    return {
      ...s,
      professionalIds: serviceIds.has(s.id) ? [...others, professionalId] : others,
    };
  });
}

/**
 * Comprueba que la foto es una subida del propio negocio en la carpeta
 * del equipo (`/api/storage/upload` con `folder=professionals`). Así no
 * se puede colar en la ficha pública una URL externa arbitraria.
 *
 * Exige el mismo origen que el proyecto de Supabase
 * (`NEXT_PUBLIC_SUPABASE_URL`) y la ruta exacta que devuelve
 * `getPublicUrl`: `/storage/v1/object/public/<bucket>/<path>`, con
 * `path = <providerId>/professionals/<uuid>.<ext>`. Sin la variable
 * configurada no hay origen contra el que comparar y se rechaza.
 */
export function isOwnProfessionalPhoto(url: string, providerId: string): boolean {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) return false;
  try {
    const expectedOrigin = new URL(supabaseUrl).origin;
    const { protocol, origin, pathname } = new URL(url);
    const prefix = `/storage/v1/object/public/provider-photos/${providerId}/professionals/`;
    // `new URL` ya resuelve los `..` literales; los codificados (`%2e`) no,
    // así que los rechazamos a mano.
    const lowered = pathname.toLowerCase();
    return (
      protocol === 'https:' &&
      origin === expectedOrigin &&
      pathname.startsWith(prefix) &&
      pathname.length > prefix.length &&
      !lowered.includes('..') &&
      !lowered.includes('%2e') &&
      !lowered.includes('%2f')
    );
  } catch {
    return false;
  }
}
