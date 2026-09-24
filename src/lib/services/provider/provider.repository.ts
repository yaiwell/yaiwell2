import 'server-only';

/**
 * Repositorio del dominio `provider` (operaciones del panel).
 *
 * Capa fina sobre Prisma: solo lectura/escritura, ninguna regla de
 * negocio. Las reglas (ownership, fusión de `LocalizedText`) viven en
 * `provider.service.ts`.
 *
 * Convivencia con otros módulos:
 *  - `provider-onboarding.repository.ts` cubre el alta inicial.
 *  - `providers.repository.ts` cubre la lectura pública (hoy fake).
 *  - Este repo cubre los updates puntuales del panel.
 *
 * `location` es PostGIS (`Unsupported` en Prisma), así que el update de
 * settings va por raw SQL igual que el INSERT del onboarding. Nos da de
 * paso la atomicidad que necesitamos: texto de la dirección y punto
 * geográfico se escriben en la MISMA sentencia o no se escribe nada.
 */

import type { Prisma } from '@prisma/client';

import { prisma } from '@/lib/db/prisma';
import type { StorableLocalizedText } from '@/lib/i18n';
import type { LocalizedText } from '@/types/domain';

import type { GeolocatedAddress } from './provider.address';

/** Subset del Provider necesario para componer el update de settings. */
export interface ProviderSettingsRow {
  id: string;
  /**
   * Sin marcar: lo que hay en BD puede no tener castellano (filas
   * anteriores al guardián, que cura `prisma/backfill-localized-es.ts`).
   * La garantía se exige al escribir, no al leer.
   */
  description: LocalizedText;
}

/** Dirección actual del provider, con el punto PostGIS ya desempaquetado. */
export interface ProviderAddressRow {
  address: string;
  lat: number;
  lng: number;
}

export interface UpdateSettingsArgs {
  businessName: string;
  vatNumber: string | null;
  /**
   * Tipo marcado a propósito: su única fábrica es el guardián de
   * `@/lib/i18n`, así que escribir una descripción sin castellano
   * —que saldría EN BLANCO en la ficha pública— no compila.
   */
  description: StorableLocalizedText;
  /**
   * Dirección **y** coordenadas como una sola unidad.
   *
   * No hay un campo `address: string` suelto a propósito: `GeolocatedAddress`
   * solo lo fabrica `parseGeolocatedAddress`, de modo que es imposible
   * compilar una llamada que actualice la calle dejando `location` con el
   * punto anterior. Ese estado corrupto fue un P0 real (ver `docs/`).
   */
  address: GeolocatedAddress;
}

export const providerRepository = {
  /**
   * Lee los campos necesarios para componer un update de settings.
   * El service lo usa para fusionar `description` antes de escribir.
   */
  async findSettings(providerId: string): Promise<ProviderSettingsRow | null> {
    const row = await prisma.provider.findFirst({
      where: { id: providerId, deletedAt: null },
      select: { id: true, description: true },
    });
    if (!row) return null;
    // `description` en Prisma viene como `JsonValue` opaco. Sabemos por
    // el resto del dominio que es un `LocalizedText`; el cast lo aclara
    // sin propagar la opacidad fuera del repo.
    return {
      id: row.id,
      description: (row.description as unknown as LocalizedText) ?? {},
    };
  },

  /**
   * Lee la dirección vigente junto a su punto PostGIS.
   *
   * La página del panel la necesita para precargar el formulario con
   * coordenadas: así, si el dueño solo edita el nombre del negocio, el
   * guardado reescribe el mismo punto en lugar de quedarse sin uno.
   * `ST_X`/`ST_Y` sobre `::geometry` es el mismo patrón que usa
   * `providers.repository.ts` para la búsqueda pública.
   */
  async findAddress(providerId: string): Promise<ProviderAddressRow | null> {
    // `id` es `text` en BD (Prisma genera uuid en aplicación), así que
    // NO casteamos a ::uuid: fallaría con "operator does not exist".
    const rows = await prisma.$queryRawUnsafe<ProviderAddressRow[]>(
      `
      SELECT
        p.address,
        ST_Y(p.location::geometry)::float8 AS lat,
        ST_X(p.location::geometry)::float8 AS lng
      FROM providers p
      WHERE p.id = $1 AND p."deletedAt" IS NULL
      LIMIT 1;
      `,
      providerId,
    );
    return rows[0] ?? null;
  },

  /**
   * Persiste los campos editables del centro en una única sentencia.
   *
   * Raw SQL porque `location` es PostGIS y Prisma no la modela. La
   * ventaja añadida es la atomicidad: `address` y `location` se
   * actualizan juntas, así que no existe la ventana en la que la calle
   * ya es nueva y el punto todavía el viejo.
   *
   * @returns número de filas actualizadas (0 si el provider no existe
   *   o quedó soft-deleted entre la lectura y la escritura).
   */
  async updateSettings(providerId: string, args: UpdateSettingsArgs): Promise<number> {
    return prisma.$executeRawUnsafe(
      `
      UPDATE providers SET
        "businessName" = $2,
        "vatNumber" = $3,
        description = $4::jsonb,
        address = $5,
        location = ST_SetSRID(ST_MakePoint($6, $7), 4326)::geography,
        "updatedAt" = NOW()
      WHERE id = $1 AND "deletedAt" IS NULL;
      `,
      providerId,
      args.businessName,
      args.vatNumber,
      JSON.stringify(args.description),
      args.address.address,
      args.address.lng,
      args.address.lat,
    );
  },

  /**
   * Devuelve el `id` y el `schedule` del **primer** Professional del
   * provider (orden por `createdAt` ascendente).
   *
   * MVP: para autónomos hay 1 Professional y representa al dueño; para
   * centros, el primer Professional creado actúa como "horario por
   * defecto del local" hasta que llegue la gestión multi-profesional
   * en el panel (deuda explícita en TODO). Si no hay ninguno (caso
   * patológico — el wizard siempre crea uno), devolvemos null y el
   * service lanza `ProviderHasNoProfessionalError`.
   */
  async findFirstProfessional(
    providerId: string,
  ): Promise<{ id: string; schedule: unknown } | null> {
    const row = await prisma.professional.findFirst({
      where: { providerId, deletedAt: null },
      orderBy: { createdAt: 'asc' },
      select: { id: true, schedule: true },
    });
    return row;
  },

  /**
   * Actualiza el `schedule` JSON de un Professional concreto. La
   * validación de la forma del JSON la hace el service con
   * `weeklyScheduleSchema` antes de llegar aquí.
   */
  async updateProfessionalSchedule(
    professionalId: string,
    schedule: Prisma.InputJsonValue,
  ): Promise<void> {
    await prisma.professional.update({
      where: { id: professionalId },
      data: { schedule },
    });
  },
};
