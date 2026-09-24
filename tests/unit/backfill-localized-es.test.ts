/**
 * Tests del backfill de castellano (`prisma/backfill-localized-es.lib.ts`).
 *
 * Prisma va mockeado con un doble mínimo: lo que se verifica es qué
 * filas se detectan como rotas, con qué texto se curan y que una
 * segunda pasada no escribe nada (idempotencia).
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  backfillLocalizedSpanish,
  type BackfillPrisma,
} from '../../prisma/backfill-localized-es.lib';

/** Construye un doble de Prisma con las filas indicadas. */
function buildPrisma(rows: {
  services?: Array<{ id: string; name: unknown; description: unknown }>;
  providers?: Array<{ id: string; description: unknown }>;
  categories?: Array<{ id: string; name: unknown }>;
}) {
  const service = { findMany: vi.fn().mockResolvedValue(rows.services ?? []), update: vi.fn() };
  const provider = { findMany: vi.fn().mockResolvedValue(rows.providers ?? []), update: vi.fn() };
  const category = { findMany: vi.fn().mockResolvedValue(rows.categories ?? []), update: vi.fn() };
  return { service, provider, category } satisfies BackfillPrisma;
}

describe('backfillLocalizedSpanish', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rellena es en un servicio creado solo en alemán', async () => {
    const prisma = buildPrisma({
      services: [{ id: 's1', name: { de: 'Haarschnitt' }, description: { de: 'Klassisch' } }],
    });

    const report = await backfillLocalizedSpanish(prisma);

    expect(report.services).toMatchObject({ scanned: 1, fixed: 1, unfixable: [] });
    expect(prisma.service.update).toHaveBeenCalledWith({
      where: { id: 's1' },
      data: {
        name: { es: 'Haarschnitt', de: 'Haarschnitt' },
        description: { es: 'Klassisch', de: 'Klassisch' },
      },
    });
  });

  it('es idempotente: no toca filas que ya tienen castellano', async () => {
    const prisma = buildPrisma({
      services: [{ id: 's1', name: { es: 'Corte' }, description: { es: 'Clásico' } }],
      providers: [{ id: 'p1', description: { es: 'Centro' } }],
      categories: [{ id: 'c1', name: { es: 'Belleza', ca: 'Bellesa' } }],
    });

    const report = await backfillLocalizedSpanish(prisma);

    expect(report.services.fixed).toBe(0);
    expect(report.providers.fixed).toBe(0);
    expect(report.categories.fixed).toBe(0);
    expect(prisma.service.update).not.toHaveBeenCalled();
    expect(prisma.provider.update).not.toHaveBeenCalled();
    expect(prisma.category.update).not.toHaveBeenCalled();
  });

  it('solo escribe el campo roto cuando el otro ya está bien', async () => {
    const prisma = buildPrisma({
      services: [{ id: 's1', name: { es: 'Corte' }, description: { ca: 'Descripció' } }],
    });

    await backfillLocalizedSpanish(prisma);

    expect(prisma.service.update).toHaveBeenCalledWith({
      where: { id: 's1' },
      data: { description: { es: 'Descripció', ca: 'Descripció' } },
    });
  });

  it('no cuenta como incidencia una descripción vacía (campo opcional)', async () => {
    const prisma = buildPrisma({
      services: [{ id: 's1', name: { es: 'Corte' }, description: {} }],
    });

    const report = await backfillLocalizedSpanish(prisma);

    expect(report.services).toMatchObject({ fixed: 0, unfixable: [] });
    expect(prisma.service.update).not.toHaveBeenCalled();
  });

  it('reporta como irreparable un servicio sin nombre en ningún idioma', async () => {
    const prisma = buildPrisma({
      services: [{ id: 's1', name: {}, description: { de: 'Klassisch' } }],
    });

    const report = await backfillLocalizedSpanish(prisma);

    expect(report.services.unfixable).toEqual(['s1']);
    // Aun así cura lo que sí se puede curar.
    expect(prisma.service.update).toHaveBeenCalledWith({
      where: { id: 's1' },
      data: { description: { es: 'Klassisch', de: 'Klassisch' } },
    });
  });

  it('tolera JSON degenerado en BD sin reventar', async () => {
    const prisma = buildPrisma({
      services: [{ id: 's1', name: null, description: ['roto'] }],
    });

    const report = await backfillLocalizedSpanish(prisma);

    expect(report.services.unfixable).toEqual(['s1']);
    expect(prisma.service.update).not.toHaveBeenCalled();
  });

  it('cura providers y categorías igual que servicios', async () => {
    const prisma = buildPrisma({
      providers: [{ id: 'p1', description: { en: 'Boutique salon' } }],
      categories: [{ id: 'c1', name: { ca: 'Bellesa' } }],
    });

    const report = await backfillLocalizedSpanish(prisma);

    expect(report.providers.fixed).toBe(1);
    expect(prisma.provider.update).toHaveBeenCalledWith({
      where: { id: 'p1' },
      data: { description: { es: 'Boutique salon', en: 'Boutique salon' } },
    });
    expect(report.categories.fixed).toBe(1);
    expect(prisma.category.update).toHaveBeenCalledWith({
      where: { id: 'c1' },
      data: { name: { es: 'Bellesa', ca: 'Bellesa' } },
    });
  });

  it('en dry-run informa pero no escribe', async () => {
    const prisma = buildPrisma({
      services: [{ id: 's1', name: { de: 'Haarschnitt' }, description: {} }],
    });

    const report = await backfillLocalizedSpanish(prisma, { dryRun: true });

    expect(report.services.fixed).toBe(1);
    expect(prisma.service.update).not.toHaveBeenCalled();
  });
});
