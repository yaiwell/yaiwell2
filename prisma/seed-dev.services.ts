/**
 * Seed de desarrollo — catálogo de servicios.
 *
 * Extraído de `seed-dev.ts` para respetar el límite de ~250 líneas por
 * archivo (CLAUDE.md §6.bis) al añadir profesionales y reservas.
 *
 * Estrategia: DELETE de los services de los providers gestionados +
 * INSERT. Es más simple que un upsert porque los services no tienen
 * clave natural y crear una compuesta solo para el seed no aporta.
 */

/* eslint-disable no-console -- script de CLI: logs en stdout son la salida esperada. */

import type { PrismaClient } from '@prisma/client';

import { fakeServices } from '../src/lib/fake-data/services';

/**
 * Resetea y vuelve a sembrar los servicios de los providers gestionados.
 *
 * Ojo al orden de llamada: las reservas sintéticas deben borrarse antes,
 * porque `Booking.serviceId` es `onDelete: Restrict` y bloquearía el
 * `deleteMany` de services.
 *
 * @param prisma — cliente ya conectado del seed principal.
 * @param providerIdMap — Map<fakeProviderId, dbProviderUuid>.
 * @param categoryIdMap — Map<fakeCategoryId, dbCategoryUuid>.
 * @param professionalIdMap — Map<fakeProviderId, dbProfessionalUuid>.
 */
export async function seedServices(
  prisma: PrismaClient,
  providerIdMap: Map<string, string>,
  categoryIdMap: Map<string, string>,
  professionalIdMap: Map<string, string>,
): Promise<void> {
  console.log('→ Reset y seed services...');
  const providerDbIds = Array.from(providerIdMap.values());
  const deleted = await prisma.service.deleteMany({
    where: { providerId: { in: providerDbIds } },
  });
  console.log(`  ✓ borrados ${deleted.count} services previos`);

  let inserted = 0;
  let skipped = 0;
  for (const fs of fakeServices) {
    const providerId = providerIdMap.get(fs.providerId);
    const categoryId = categoryIdMap.get(fs.categoryId);
    if (!providerId || !categoryId) {
      console.warn(`  ⚠ skip ${fs.id}: providerId=${fs.providerId} categoryId=${fs.categoryId}`);
      skipped++;
      continue;
    }
    await prisma.service.create({
      data: {
        providerId,
        categoryId,
        // Atamos el servicio al profesional de su provider: sin esta FK
        // el motor de availability tendría que adivinar el profesional y
        // el listado quedaría sin horario que consultar.
        professionalId: professionalIdMap.get(fs.providerId) ?? null,
        // LocalizedText es { es, ca } pero el tipo no declara index
        // signature; Prisma quiere JsonObject. Cast literal porque la
        // forma es serializable.
        name: fs.name as unknown as Record<string, string>,
        description: fs.description as unknown as Record<string, string>,
        durationMinutes: fs.durationMinutes,
        priceCents: fs.priceCents,
      },
    });
    inserted++;
  }
  console.log(`  ✓ insertados ${inserted} services (${skipped} skipped)`);
}
