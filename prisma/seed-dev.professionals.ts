/**
 * Seed de desarrollo — profesionales y horarios.
 *
 * Se separa de `seed-dev.ts` para no pasar de ~250 líneas por archivo
 * (CLAUDE.md §6.bis) y porque la tabla de horarios es el dato que más
 * se toca cuando queremos reproducir un escenario concreto en dev.
 *
 * Por qué existe: sin `Professional` no hay `schedule`, y sin `schedule`
 * el motor de availability no puede calcular slots — el listado público
 * `/buscar` pintaría todos los proveedores en gris. Creamos exactamente
 * 1 profesional por provider (el centro dará de alta su equipo real
 * desde el panel; este es el placeholder equivalente al del onboarding).
 *
 * Los horarios se VARÍAN a propósito entre providers: queremos que en
 * dev se vean los tres estados de disponibilidad (verde = hueco ahora,
 * ámbar = hueco más tarde hoy, gris = sin huecos hoy) sin tener que
 * tocar la BD a mano. Con un único horario amplio para todos, la feature
 * nacería visualmente muerta (todo verde) y no detectaríamos regresiones.
 */

import type { Prisma, PrismaClient } from '@prisma/client';

import { fakeProviders } from '../src/lib/fake-data/providers';

// ============================================================================
// Plantillas de horario
// ============================================================================

/**
 * Forma del JSON de `Professional.schedule`. Debe pasar
 * `weeklyScheduleSchema` (`src/lib/services/availability/availability.validation.ts`):
 * las 7 claves de día son obligatorias y cada bloque cumple `open < close`.
 * Si falta un día, el motor descarta el horario entero (`InvalidScheduleError`).
 */
export interface WeeklyScheduleSeed {
  monday: { open: string; close: string }[];
  tuesday: { open: string; close: string }[];
  wednesday: { open: string; close: string }[];
  thursday: { open: string; close: string }[];
  friday: { open: string; close: string }[];
  saturday: { open: string; close: string }[];
  sunday: { open: string; close: string }[];
}

const FULL_DAY = [{ open: '09:00', close: '21:00' }];
const SPLIT_DAY = [
  { open: '10:00', close: '14:00' },
  { open: '16:00', close: '20:00' },
];
const MORNING = [{ open: '10:00', close: '14:00' }];
const EVENING = [{ open: '16:00', close: '20:00' }];

/**
 * Horario amplio, 7 días 09:00-21:00. Pensado para gimnasios y clubes
 * deportivos, que en la práctica abren de sol a sol. En `/buscar` estos
 * providers deben salir casi siempre en verde.
 */
const WIDE_SCHEDULE: WeeklyScheduleSeed = {
  monday: FULL_DAY,
  tuesday: FULL_DAY,
  wednesday: FULL_DAY,
  thursday: FULL_DAY,
  friday: FULL_DAY,
  saturday: FULL_DAY,
  sunday: FULL_DAY,
};

/**
 * Horario partido de comercio español clásico (10-14 / 16-20), lunes a
 * sábado con domingo cerrado. Genera el caso interesante: a las 15:00 el
 * provider está cerrado pero aún tiene hueco a las 16:00 → ámbar.
 */
const SPLIT_SCHEDULE: WeeklyScheduleSeed = {
  monday: SPLIT_DAY,
  tuesday: SPLIT_DAY,
  wednesday: SPLIT_DAY,
  thursday: SPLIT_DAY,
  friday: SPLIT_DAY,
  saturday: MORNING,
  sunday: [],
};

/**
 * Horario reducido de autónomo a tiempo parcial: solo tardes de miércoles
 * a viernes y mañana de sábado. Cuatro días de la semana cerrado del todo,
 * así garantizamos ver el estado gris en dev cualquier día que se mire.
 */
const LIMITED_SCHEDULE: WeeklyScheduleSeed = {
  monday: [],
  tuesday: [],
  wednesday: EVENING,
  thursday: EVENING,
  friday: EVENING,
  saturday: MORNING,
  sunday: [],
};

// ============================================================================
// Reparto por provider
// ============================================================================

interface ProfessionalSeed {
  /** Nombre visible del profesional, coherente con el negocio. */
  name: string;
  schedule: WeeklyScheduleSeed;
}

/**
 * Un profesional por slug de provider. Los nombres son placeholders
 * creíbles: en autónomos el titular, en centros la persona de referencia
 * del equipo (el dueño podrá renombrarlos desde el panel).
 */
const PROFESSIONAL_SEEDS: Record<string, ProfessionalSeed> = {
  'atelier-norte': { name: 'Nuria Vidal', schedule: WIDE_SCHEDULE },
  'casa-mar-massatges': { name: 'Marc Puig', schedule: SPLIT_SCHEDULE },
  'estudi-ungla': { name: 'Aina Ferrer', schedule: SPLIT_SCHEDULE },
  'born-padel-club': { name: 'Pista central', schedule: WIDE_SCHEDULE },
  'spa-sarria': { name: 'Elena Roig', schedule: SPLIT_SCHEDULE },
  'gimnas-boutique-poblenou': { name: 'Sala principal', schedule: WIDE_SCHEDULE },
  'pell-clinic': { name: 'Dra. Clara Sanz', schedule: SPLIT_SCHEDULE },
  'silvia-makeup-studio': { name: 'Sílvia Ortega', schedule: LIMITED_SCHEDULE },
  'iyengar-iuna': { name: 'Iuna Martí', schedule: LIMITED_SCHEDULE },
  'club-tennis-pedralbes': { name: 'Pista 1', schedule: WIDE_SCHEDULE },
  'salo-bellesa-castellar': { name: 'Rosa Bonet', schedule: SPLIT_SCHEDULE },
  'crossfit-llica-vall': { name: 'Box Lliçà', schedule: LIMITED_SCHEDULE },
};

/**
 * Fallback para providers fake que se añadan sin entrada explícita:
 * horario partido, que es el caso más común del sector en España.
 */
function resolveSeed(slug: string, providerName: string): ProfessionalSeed {
  return PROFESSIONAL_SEEDS[slug] ?? { name: providerName, schedule: SPLIT_SCHEDULE };
}

// ============================================================================
// Upsert
// ============================================================================

/**
 * Crea (o refresca) un Professional por provider gestionado por el seed.
 *
 * Idempotencia: no hay clave natural única en `professionals`, así que
 * buscamos el profesional vivo más antiguo del provider y lo actualizamos
 * en lugar de insertar uno nuevo. Reejecutar el seed refresca el horario
 * sin duplicar filas ni romper las FK `Restrict` de bookings existentes.
 *
 * @param prisma — cliente ya conectado que crea el seed principal.
 * @param providerIdMap — Map<fakeProviderId, dbProviderUuid>.
 * @returns Map<fakeProviderId, dbProfessionalUuid>.
 */
export async function upsertProfessionals(
  prisma: PrismaClient,
  providerIdMap: Map<string, string>,
): Promise<Map<string, string>> {
  const result = new Map<string, string>();

  for (const fp of fakeProviders) {
    const providerId = providerIdMap.get(fp.id);
    if (!providerId) continue;

    const seed = resolveSeed(fp.slug, fp.name);
    // El cast preserva la forma literal sin arrastrar los tipos JSON
    // generados por Prisma hasta la definición de las plantillas.
    const schedule = seed.schedule as unknown as Prisma.InputJsonValue;

    const existing = await prisma.professional.findFirst({
      where: { providerId, deletedAt: null },
      orderBy: { createdAt: 'asc' },
      select: { id: true },
    });

    if (existing) {
      await prisma.professional.update({
        where: { id: existing.id },
        data: { name: seed.name, schedule },
      });
      result.set(fp.id, existing.id);
      continue;
    }

    const created = await prisma.professional.create({
      data: { providerId, userId: null, name: seed.name, schedule },
      select: { id: true },
    });
    result.set(fp.id, created.id);
  }

  return result;
}
